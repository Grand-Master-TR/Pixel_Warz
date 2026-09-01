import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

class StoreEngine {
  // Get available Telegram Stars packages (Pixels + Bombs)
  getPackages() {
    return {
      pixels: CONFIG.STARS_PACKAGES,
      bombs: CONFIG.STARS_BOMB_PACKAGES,
    };
  }

  // Handle Stars Purchase fulfillment (Pixels OR Bombs)
  creditStarsPurchase(userId, packageId, chargeId = null) {
    const pixelPkg = CONFIG.STARS_PACKAGES.find((p) => p.id === packageId);
    const bombPkg = CONFIG.STARS_BOMB_PACKAGES.find((p) => p.id === packageId);
    const pkg = pixelPkg || bombPkg;

    if (!pkg) {
      throw new Error("Invalid package ID");
    }

    const now = Math.floor(Date.now() / 1000);
    const txnId = `stars_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isBomb = Boolean(bombPkg);

    const fulfill = db.transaction(() => {
      if (isBomb) {
        db.prepare("UPDATE users SET bomb_balance = bomb_balance + ? WHERE id = ?")
          .run(pkg.bombs, userId);

        db.prepare(`
          INSERT INTO transactions (id, user_id, type, amount_stars, pixels_awarded, details, created_at)
          VALUES (?, ?, 'BOMB_PURCHASE', ?, 0, ?, ?)
        `).run(txnId, userId, pkg.stars, JSON.stringify({ packageId, chargeId, bombs: pkg.bombs }), now);
      } else {
        db.prepare("UPDATE users SET pixel_balance = pixel_balance + ? WHERE id = ?")
          .run(pkg.pixels, userId);

        db.prepare(`
          INSERT INTO transactions (id, user_id, type, amount_stars, pixels_awarded, details, created_at)
          VALUES (?, ?, 'STARS_PURCHASE', ?, ?, ?, ?)
        `).run(txnId, userId, pkg.stars, pkg.pixels, JSON.stringify({ packageId, chargeId }), now);
      }
    });

    fulfill();

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    return {
      success: true,
      isBomb,
      bombsAdded: isBomb ? pkg.bombs : 0,
      pixelsAdded: !isBomb ? pkg.pixels : 0,
      newPixelBalance: user.pixel_balance,
      newBombBalance: user.bomb_balance,
      package: pkg
    };
  }

  // Handle AdsGram Rewarded Video Ad watch completion
  creditAdWatch(userId) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Math.floor(Date.now() / 1000);
    const cooldown = CONFIG.ADS.COOLDOWN_SECONDS;

    if (now - user.last_ad_watch < cooldown) {
      const waitLeft = cooldown - (now - user.last_ad_watch);
      throw new Error(`Ad cooldown in effect. Please wait ${waitLeft} more seconds.`);
    }

    const pixelsToAdd = CONFIG.ADS.PIXELS_PER_AD; // 10 pixels per ad (10x)
    const txnId = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    db.transaction(() => {
      db.prepare(`
        UPDATE users SET 
          pixel_balance = pixel_balance + ?,
          last_ad_watch = ?
        WHERE id = ?
      `).run(pixelsToAdd, now, userId);

      db.prepare(`
        INSERT INTO transactions (id, user_id, type, pixels_awarded, details, created_at)
        VALUES (?, ?, 'AD_REWARD', ?, ?, ?)
      `).run(txnId, userId, pixelsToAdd, JSON.stringify({ adNetwork: "AdsGram" }), now);
    })();

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    return {
      success: true,
      pixelsAdded: pixelsToAdd,
      newBalance: updatedUser.pixel_balance,
      nextAvailableIn: CONFIG.ADS.COOLDOWN_SECONDS
    };
  }

  // Daily Streak Claim
  claimDailyStreak(userId) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) throw new Error("User not found");

    const now = Math.floor(Date.now() / 1000);
    const oneDaySecs = 86400;
    const timeSinceLastClaim = now - user.last_daily_claim;

    // Check if claimed in last 20 hours
    if (timeSinceLastClaim < 72000 && user.last_daily_claim > 0) {
      const hoursRemaining = Math.ceil((72000 - timeSinceLastClaim) / 3600);
      throw new Error(`Daily reward already claimed. Next claim ready in ~${hoursRemaining} hours.`);
    }

    // Determine streak (if within 48 hours, advance streak; else reset to 1)
    let newStreak = 1;
    if (user.last_daily_claim > 0 && timeSinceLastClaim <= (oneDaySecs * 2)) {
      newStreak = (user.daily_streak % 7) + 1;
    }

    const rewardsArray = CONFIG.ADS.DAILY_STREAK_REWARDS || [10, 10, 20, 20, 30, 30, 50];
    const rewardPixels = rewardsArray[newStreak - 1] || 10;
    const txnId = `daily_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    db.transaction(() => {
      db.prepare(`
        UPDATE users SET
          pixel_balance = pixel_balance + ?,
          daily_streak = ?,
          last_daily_claim = ?
        WHERE id = ?
      `).run(rewardPixels, newStreak, now, userId);

      db.prepare(`
        INSERT INTO transactions (id, user_id, type, pixels_awarded, details, created_at)
        VALUES (?, ?, 'DAILY_CLAIM', ?, ?, ?)
      `).run(txnId, userId, rewardPixels, JSON.stringify({ streakDay: newStreak }), now);
    })();

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    return {
      success: true,
      streakDay: newStreak,
      pixelsAdded: rewardPixels,
      newBalance: updatedUser.pixel_balance
    };
  }
}

export const storeEngine = new StoreEngine();