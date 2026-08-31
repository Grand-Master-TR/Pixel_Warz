import express from "express";
import { storeEngine } from "../services/storeEngine.js";
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
    dailyStreakBase: CONFIG.ADS.DAILY_STREAK_BASE
  });
});

// Watch Ad reward fulfillment (AdsGram completion)
storeRouter.post("/watch-ad", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  try {
    const result = storeEngine.creditAdWatch(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Claim Daily Streak reward
storeRouter.post("/claim-daily", (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  try {
    const result = storeEngine.claimDailyStreak(userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create Telegram Stars invoice link (or simulate in development)
storeRouter.post("/create-invoice", async (req, res) => {
  const { userId, packageId } = req.body;
  const pkg = CONFIG.STARS_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return res.status(400).json({ error: "Invalid package." });
  }

  try {
    // If bot token is real, Bot API can call createInvoiceLink
    // In dev / demo mode, return simulated invoice link
    const invoiceLink = `https://t.me/\$pixel_wars_bot?start=invoice_${packageId}_${userId}`;
    res.json({
      invoiceLink,
      package: pkg,
      isSimulation: CONFIG.BOT_TOKEN === "DEMO_BOT_TOKEN"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate Stars purchase fulfillment (for testing & development)
storeRouter.post("/simulate-stars-purchase", (req, res) => {
  const { userId, packageId } = req.body;
  if (!userId || !packageId) {
    return res.status(400).json({ error: "userId and packageId required." });
  }

  try {
    const result = storeEngine.creditStarsPurchase(userId, packageId, "simulated_test_charge");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
