import { db } from "../database/db.js";
import { CONFIG } from "../config.js";
import { canvasManager } from "./canvasManager.js";

class AirdropEngine {
  // Process a batch of pixel placements from a user (Supports regular pixels & 3x3 Bomb power-up)
  processPixelPlacements(userId, pixelsToPlace, useBomb = false) {
    if (!pixelsToPlace || !Array.isArray(pixelsToPlace) || pixelsToPlace.length === 0) {
      throw new Error("No pixels provided for placement.");
    }

    const count = pixelsToPlace.length;

    // Check user profile & balance
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (useBomb) {
      if ((user.bomb_balance || 0) < 1) {
        throw new Error("You do not have any Paint Bombs. Buy bombs in the Shop to blast 3x3 areas!");
      }
    } else {
      if (user.pixel_balance < count) {
        throw new Error(`Insufficient pixel balance. You have ${user.pixel_balance} pixels, but tried to place ${count}.`);
      }
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
          points = CONFIG.POINTS.RECOLOR_PIXEL; // 15.0 pts (10x)
        } else {
          freshCount++;
          points = CONFIG.POINTS.FRESH_PIXEL;   // 10.0 pts (10x)
        }

        totalPointsAwarded += points;

        insertLog.run(userId, x, y, colorIndex, applied.isRecolor ? 1 : 0, points, now);
      }

      const totalPlaced = freshCount + recolorCount;
      if (totalPlaced === 0) {
        throw new Error("No valid coordinates to place.");
      }

      // Deduct balance and update user stats
      if (useBomb) {
        db.prepare(`
          UPDATE users SET
            bomb_balance = bomb_balance - 1,
            total_pixels_placed = total_pixels_placed + ?,
            fresh_pixels_placed = fresh_pixels_placed + ?,
            recolored_pixels_placed = recolored_pixels_placed + ?,
            airdrop_points = airdrop_points + ?
          WHERE id = ?
        `).run(totalPlaced, freshCount, recolorCount, totalPointsAwarded, userId);
      } else {
        db.prepare(`
          UPDATE users SET
            pixel_balance = pixel_balance - ?,
            total_pixels_placed = total_pixels_placed + ?,
            fresh_pixels_placed = fresh_pixels_placed + ?,
            recolored_pixels_placed = recolored_pixels_placed + ?,
            airdrop_points = airdrop_points + ?
          WHERE id = ?
        `).run(totalPlaced, totalPlaced, freshCount, recolorCount, totalPointsAwarded, userId);
      }

      // Handle 10% Referral Commission
      if (user.referrer_id) {
        const referralBonus = totalPointsAwarded * CONFIG.POINTS.REFERRAL_RATE; // 10%

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
          JSON.stringify({ fromUser: userId, friendEarned: totalPointsAwarded, commission: referralBonus, isBomb: useBomb }),
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

      // Check and advance Milestone Rounds & Snapshot
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
      newBombBalance: updatedUser.bomb_balance,
      newTotalPoints: updatedUser.airdrop_points,
      appliedPixels,
    };
  }

  // Check and advance 50-round milestones & snapshot all user data
  checkMilestones(globalPixelsPlaced, timestamp) {
    const currentActive = db.prepare("SELECT * FROM milestones WHERE status = 'ACTIVE' ORDER BY round_number ASC LIMIT 1").get();
    if (!currentActive) return;

    if (globalPixelsPlaced >= currentActive.target_pixels) {
      // 1. Snapshot all users who earned airdrop points or placed pixels
      const allQualifyingUsers = db.prepare(`
        SELECT 
          id,
          username,
          first_name,
          wallet_address,
          airdrop_points,
          referral_points,
          total_pixels_placed,
          fresh_pixels_placed,
          recolored_pixels_placed,
          referrer_id
        FROM users
        WHERE airdrop_points > 0 OR total_pixels_placed > 0
        ORDER BY airdrop_points DESC
      `).all();

      const totalPoints = allQualifyingUsers.reduce((sum, u) => sum + (u.airdrop_points || 0), 0);
      const snapshotPayload = {
        roundNumber: currentActive.round_number,
        targetPixels: currentActive.target_pixels,
        globalPixelsPlacedAtSnapshot: globalPixelsPlaced,
        timestamp,
        date: new Date(timestamp * 1000).toISOString(),
        totalUsers: allQualifyingUsers.length,
        totalPointsDistributed: totalPoints,
        users: allQualifyingUsers
      };

      // 2. Save snapshot in SQLite round_snapshots table
      db.prepare(`
        INSERT INTO round_snapshots (round_number, target_pixels, reached_at, total_users_count, total_points_distributed, snapshot_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        currentActive.round_number,
        currentActive.target_pixels,
        timestamp,
        allQualifyingUsers.length,
        totalPoints,
        JSON.stringify(snapshotPayload)
      );

      console.log(`📸 AIRDROP SNAPSHOT CAPTURED FOR ROUND ${currentActive.round_number}: Stored ${allQualifyingUsers.length} users with ${totalPoints} total points!`);

      // 3. Mark current round as completed
      db.prepare("UPDATE milestones SET status = 'COMPLETED', reached_at = ? WHERE round_number = ?")
        .run(timestamp, currentActive.round_number);

      // 4. Unlock next round if available
      const nextRoundNum = currentActive.round_number + 1;
      if (nextRoundNum <= CONFIG.ROUNDS.MAX_ROUNDS) {
        db.prepare("UPDATE milestones SET status = 'ACTIVE' WHERE round_number = ?").run(nextRoundNum);
      }
    }
  }

  // Get list of all completed round snapshots
  getSnapshotsList() {
    return db.prepare(`
      SELECT 
        id, 
        round_number, 
        target_pixels, 
        reached_at, 
        total_users_count, 
        total_points_distributed 
      FROM round_snapshots 
      ORDER BY round_number DESC
    `).all();
  }

  // Get full snapshot JSON for a specific round
  getSnapshotByRound(roundNumber) {
    const record = db.prepare("SELECT * FROM round_snapshots WHERE round_number = ?").get(roundNumber);
    if (!record) return null;
    return JSON.parse(record.snapshot_json);
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
        wallet_address,
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