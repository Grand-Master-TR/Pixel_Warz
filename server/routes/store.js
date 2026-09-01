import express from "express";
import { storeEngine } from "../services/storeEngine.js";
import { createStarsInvoiceLink } from "../bot.js";
import { requireAuth } from "../services/auth.js";
import { CONFIG } from "../config.js";

export const storeRouter = express.Router();

// Get list of Star packages and prices
storeRouter.get("/packages", (req, res) => {
  res.json({
    packages: storeEngine.getPackages(),
    adReward: {
      pixelsPerAd: CONFIG.ADS.PIXELS_PER_AD,
      cooldownSeconds: CONFIG.ADS.COOLDOWN_SECONDS,
    },
    dailyStreakRewards: CONFIG.ADS.DAILY_STREAK_REWARDS
  });
});

// Watch Ad reward fulfillment (Protected with requireAuth & cooldown verification)
storeRouter.post("/watch-ad", requireAuth, (req, res) => {
  const userId = req.userId;

  try {
    const result = storeEngine.creditAdWatch(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Claim Daily Streak reward (Protected with requireAuth)
storeRouter.post("/claim-daily", requireAuth, (req, res) => {
  const userId = req.userId;

  try {
    const result = storeEngine.claimDailyStreak(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create Telegram Stars invoice link (Protected with requireAuth)
storeRouter.post("/create-invoice", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { packageId } = req.body;

  if (!packageId) {
    return res.status(400).json({ error: "packageId is required." });
  }

  try {
    const invoiceData = await createStarsInvoiceLink(userId, packageId);
    res.json(invoiceData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate Stars purchase (Sandbox/dev only)
storeRouter.post("/simulate-stars-purchase", requireAuth, (req, res) => {
  if (CONFIG.NODE_ENV === "production" && CONFIG.BOT_TOKEN !== "DEMO_BOT_TOKEN") {
    return res.status(403).json({ error: "Simulated purchases are strictly disabled in production." });
  }

  const userId = req.userId;
  const { packageId } = req.body;
  if (!packageId) {
    return res.status(400).json({ error: "packageId required." });
  }

  try {
    const result = storeEngine.creditStarsPurchase(userId, packageId, "dev_sandbox_charge");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});