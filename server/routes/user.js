import express from "express";
import { validateTelegramInitData, getOrCreateUser } from "../services/auth.js";
import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

export const userRouter = express.Router();

// Authenticate or initialize user from Telegram initData
userRouter.post("/auth", (req, res) => {
  const { initData, devUserId, devUsername, referrerId } = req.body;

  let tgUser = null;

  if (initData) {
    tgUser = validateTelegramInitData(initData);
  }

  // Fallback for development / browser testing
  if (!tgUser && (devUserId || CONFIG.NODE_ENV === "development")) {
    const id = devUserId || "guest_1001";
    tgUser = {
      id: id,
      username: devUsername || `player_${id.slice(-4)}`,
      first_name: "Pixel Master",
    };
  }

  if (!tgUser) {
    return res.status(401).json({ error: "Invalid Telegram authentication data." });
  }

  try {
    const user = getOrCreateUser(tgUser, referrerId);
    
    // Count active referrals
    const refCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE referrer_id = ?").get(user.id).count;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        pixelBalance: user.pixel_balance,
        totalPixelsPlaced: user.total_pixels_placed,
        freshPixelsPlaced: user.fresh_pixels_placed,
        recoloredPixelsPlaced: user.recolored_pixels_placed,
        airdropPoints: user.airdrop_points,
        referralPoints: user.referral_points,
        referrerId: user.referrer_id,
        dailyStreak: user.daily_streak,
        lastDailyClaim: user.last_daily_claim,
        lastAdWatch: user.last_ad_watch,
        referralCount: refCount,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch latest profile state
userRouter.get("/profile/:id", (req, res) => {
  const userId = req.params.id;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const refCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE referrer_id = ?").get(user.id).count;

  res.json({
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    pixelBalance: user.pixel_balance,
    totalPixelsPlaced: user.total_pixels_placed,
    freshPixelsPlaced: user.fresh_pixels_placed,
    recoloredPixelsPlaced: user.recolored_pixels_placed,
    airdropPoints: user.airdrop_points,
    referralPoints: user.referral_points,
    referrerId: user.referrer_id,
    dailyStreak: user.daily_streak,
    lastDailyClaim: user.last_daily_claim,
    lastAdWatch: user.last_ad_watch,
    referralCount: refCount,
  });
});
