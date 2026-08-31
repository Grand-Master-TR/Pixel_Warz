import { db } from "../database/db.js";
import { CONFIG } from "../config.js";
import { canvasManager } from "./canvasManager.js";

class AirdropEngine {
  // Process a batch of pixel placements from a user
  processPixelPlacements(userId, pixelsToPlace) {
    if (!pixelsToPlace || !Array.isArray(pixelsToPlace) || pixelsToPlace.length === 0) {
      throw new Error("No pixels provided for placement.");
    }

    const count = pixelsToPlace.length;

    // Check user profile & balance
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (user.pixel_balance < count) {
      throw new Error(`Insufficient pixel balance. You have ${user.pixel_balance} pixels, but tried to place ${count}.`);
    }

    const now = Math.floor(Date.now() / 1000);
    let freshCount = 0;
    let recolorCount = 0;
    let totalPointsAwarded = 0;
    const appliedPixels = [];

    // Execute atomic placement transaction
    const executeBatch = db.transaction(() => {
      const insertLog = db.prepare(`
        INSERT INTO placements_log (user_id, x, y, color_index, is_recolor, points_awarded, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of pixelsToPlace) {
        const { x, y, colorIndex } = p;
        if (x < 0 || x >= CONFIG.CANVAS_WIDTH || y < 0 || y >= CONFIG.CANVAS_HEIGHT) {
          continue;
        }
        if (colorIndex < 0 || colorIndex >= CONFIG.PALETTE.length) {
          continue;
        }

        // Apply pixel to canvas
        const applied = canvasManager.applyPixel(userId, x, y, colorIndex, now);
        appliedPixels.push(applied);

        let points = 0;
        if (applied.isRecolor) {
          recolorCount++;
          points = CONFIG.POINTS.RECOLOR_PIXEL; // 1.5 pts
        } else {
          freshCount++;
          points = CONFIG.POINTS.FRESH_PIXEL;   // 1.0 pt
        }

        totalPointsAwarded += points;

        insertLog.run(userId, x, y, colorIndex, applied.isRecolor ? 1 : 0, points, now);
      }

      const totalPlaced = freshCount + recolorCount;
      if (totalPlaced === 0) {
        throw new Error("No valid coordinates to place.");
      }

      // Deduct balance and update user stats
      db.prepare(`
        UPDATE users SET
          pixel_balance = pixel_balance - ?,
          total_pixels_placed = total_pixels_placed + ?,
          fresh_pixels_placed = fresh_pixels_placed + ?,
          recolored_pixels_placed = recolored_pixels_placed + ?,
          airdrop_points = airdrop_points + ?
        WHERE id = ?
      `).run(totalPlaced, totalPlaced, freshCount, recolorCount, totalPointsAwarded, userId);

      // Handle 10% Referral Commission
      let referralBonusGiven = 0;
      if (user.referrer_id) {
        const referralBonus = totalPointsAwarded * CONFIG.POINTS.REFERRAL_RATE; // 10%
        referralBonusGiven = referralBonus;

        db.prepare(`
          UPDATE users SET
            referral_points = referral_points + ?,
            airdrop_points = airdrop_points + ?
          WHERE id = ?
        `).run(referralBonus, referralBonus, user.referrer_id);

        db.prepare(`
          INSERT INTO transactions (id, user_id, type, pixels_awarded, details, created_at)
          VALUES (?, ?, 'REFERRAL_COMMISSION', 0, ?, ?)
        `).run(
          `ref_comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          user.referrer_id,
          JSON.stringify({ fromUser: userId, friendEarned: totalPointsAwarded, commission: referralBonus }),
          now
        );
      }

      // Update Global Total Pixels Placed
      const currentGlobal = parseInt(
        db.prepare("SELECT value FROM system_stats WHERE key = 'total_pixels_placed'").get()?.value || "0",
        10
      );
      const newGlobal = currentGlobal + totalPlaced;
      db.prepare("UPDATE system_stats SET value = ? WHERE key = 'total_pixels_placed'").run(newGlobal.toString());

      // Update Milestone Rounds
      this.checkMilestones(newGlobal, now);
    });

    executeBatch();

    // Get updated user profile
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

    return {
      placedCount: appliedPixels.length,
      freshCount,
      recolorCount,
      pointsAwarded: totalPointsAwarded,
      newBalance: updatedUser.pixel_balance,
      newTotalPoints: updatedUser.airdrop_points,
      appliedPixels,
    };
  }

  // Check and advance 50-round milestones
  checkMilestones(globalPixelsPlaced, timestamp) {
    const currentActive = db.prepare("SELECT * FROM milestones WHERE status = 'ACTIVE' ORDER BY round_number ASC LIMIT 1").get();
    if (!currentActive) return;

    if (globalPixelsPlaced >= currentActive.target_pixels) {
      // Mark current round as completed
      db.prepare("UPDATE milestones SET status = 'COMPLETED', reached_at = ? WHERE round_number = ?")
        .run(timestamp, currentActive.round_number);

      // Unlock next round if available
      const nextRoundNum = currentActive.round_number + 1;
      if (nextRoundNum <= CONFIG.ROUNDS.MAX_ROUNDS) {
        db.prepare("UPDATE milestones SET status = 'ACTIVE' WHERE round_number = ?").run(nextRoundNum);
      }
    }
  }

  // Get current milestone info
  getMilestoneStats() {
    const globalPixels = parseInt(
      db.prepare("SELECT value FROM system_stats WHERE key = 'total_pixels_placed'").get()?.value || "0",
      10
    );

    const activeRound = db.prepare("SELECT * FROM milestones WHERE status = 'ACTIVE' LIMIT 1").get() || {
      round_number: CONFIG.ROUNDS.MAX_ROUNDS,
      target_pixels: CONFIG.ROUNDS.MAX_TOTAL_PIXELS,
      status: "ACTIVE",
    };

    const previousTarget = (activeRound.round_number - 1) * CONFIG.ROUNDS.PIXELS_PER_ROUND;
    const roundProgressPixels = Math.max(0, globalPixels - previousTarget);
    const roundTargetPixels = CONFIG.ROUNDS.PIXELS_PER_ROUND;
    const progressPercent = Math.min(100, Math.round((roundProgressPixels / roundTargetPixels) * 1000) / 10);

    const allRounds = db.prepare("SELECT * FROM milestones ORDER BY round_number ASC").all();

    return {
      globalPixelsPlaced: globalPixels,
      maxRounds: CONFIG.ROUNDS.MAX_ROUNDS,
      maxTotalPixels: CONFIG.ROUNDS.MAX_TOTAL_PIXELS,
      activeRoundNumber: activeRound.round_number,
      activeRoundTarget: activeRound.target_pixels,
      roundProgressPixels,
      roundTargetPixels,
      progressPercent,
      allRounds,
    };
  }

  // Leaderboard of top 100 users by Airdrop points
  getLeaderboard(limit = 100) {
    return db.prepare(`
      SELECT 
        id, 
        username, 
        first_name, 
        total_pixels_placed, 
        recolored_pixels_placed,
        fresh_pixels_placed, 
        airdrop_points, 
        referral_points
      FROM users
      ORDER BY airdrop_points DESC
      LIMIT ?
    `).all(limit);
  }
}

export const airdropEngine = new AirdropEngine();
