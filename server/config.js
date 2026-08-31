import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  BOT_TOKEN: process.env.BOT_TOKEN || "DEMO_BOT_TOKEN",
  WEBAPP_URL: process.env.WEBAPP_URL || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Canvas configuration (1000 x 1000 = 1 Million Pixels)
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 1000,
  TOTAL_CANVAS_PIXELS: 1000000,

  // Starter Giveaway Pixels
  STARTER_FREE_PIXELS: 1,

  // Airdrop Point Rewards
  POINTS: {
    FRESH_PIXEL: 1.0,        // 1.0 point for placing on blank/white pixel
    RECOLOR_PIXEL: 1.5,      // 1.5 points for overwriting an already placed pixel
    REFERRAL_RATE: 0.10,     // 10% commission on all points earned by invited user
  },

  // 50 Airdrop Milestone Rounds (10M each up to 500M)
  ROUNDS: {
    MAX_ROUNDS: 50,
    PIXELS_PER_ROUND: 10000000, // 10 Million per round
    MAX_TOTAL_PIXELS: 500000000, // 500 Million total
  },

  // Telegram Stars Packages
  STARS_PACKAGES: [
    { id: "stars_1", stars: 1, pixels: 10, bonusPercent: 0, label: "Starter Pack" },
    { id: "stars_10", stars: 10, pixels: 100, bonusPercent: 0, label: "Colorist Pack", popular: true },
    { id: "stars_50", stars: 50, pixels: 550, bonusPercent: 10, label: "Artist Bundle" },
    { id: "stars_100", stars: 100, pixels: 1200, bonusPercent: 20, label: "Master Painter" },
    { id: "stars_500", stars: 500, pixels: 6500, bonusPercent: 30, label: "Canvas Warlord", bestValue: true },
  ],

  // Ad Rewards & Reduced Daily Streak Rewards (Day 1-7)
  ADS: {
    PIXELS_PER_AD: 1,
    COOLDOWN_SECONDS: 30,
    DAILY_STREAK_REWARDS: [1, 1, 2, 2, 3, 3, 5], // D1:1, D2:1, D3:2, D4:2, D5:3, D6:3, D7:5
  },

  // 32-Color Palette (Hex Codes)
  PALETTE: [
    "#FFFFFF", "#E4E4E4", "#888888", "#222222", "#000000", // Grayscale
    "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", // Warm
    "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", // Cool
    "#CF6EE4", "#820080", "#FF4500", "#FFA800", "#FFD635", // Vibrant
    "#00A368", "#7EED56", "#2450A4", "#3690EA", "#51E9F4", // Extended
    "#811E9F", "#B44AC0", "#FF99AA", "#9C6926", "#6D001A", // Dark shades
    "#00392B", "#493AC1"                                  // Deep accents
  ]
};