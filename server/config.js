import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  BOT_TOKEN: process.env.BOT_TOKEN || "DEMO_BOT_TOKEN",
  WEBAPP_URL: process.env.WEBAPP_URL || "https://pixel-warz.vercel.app",
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Canvas configuration (1000 x 1000 = 1 Million Pixels)
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 1000,
  TOTAL_CANVAS_PIXELS: 1000000,

  // 10x Starter Giveaway Pixels (10 Free Pixels)
  STARTER_FREE_PIXELS: 10,

  // 10x Airdrop Point Rewards
  POINTS: {
    FRESH_PIXEL: 10.0,       // 10.0 points for placing on blank/white pixel
    RECOLOR_PIXEL: 15.0,     // 15.0 points for overwriting an already placed pixel (50% bonus)
    REFERRAL_RATE: 0.10,     // 10% commission on all points earned by invited friend
  },

  // 10x Airdrop Milestones: 50 Rounds (100M each up to 5 Billion Pixels)
  ROUNDS: {
    MAX_ROUNDS: 50,
    PIXELS_PER_ROUND: 100000000,  // 100 Million pixels per round
    MAX_TOTAL_PIXELS: 5000000000, // 5 Billion pixels total
  },

  // 10x Telegram Stars Packages (1 Star = 100 Pixels)
  STARS_PACKAGES: [
    { id: "stars_1", stars: 1, pixels: 100, bonusPercent: 0, label: "Starter Pixel Pouch" },
    { id: "stars_10", stars: 10, pixels: 1000, bonusPercent: 0, label: "Colorist Box", popular: true },
    { id: "stars_50", stars: 50, pixels: 5500, bonusPercent: 10, label: "Painter Bundle" },
    { id: "stars_100", stars: 100, pixels: 12000, bonusPercent: 20, label: "Master Canvas Chest" },
    { id: "stars_500", stars: 500, pixels: 65000, bonusPercent: 30, label: "Canvas Warlord Treasury", bestValue: true },
  ],

  // 10x Ad Rewards & Daily Streak Rewards (Day 1-7)
  ADS: {
    PIXELS_PER_AD: 10, // 10 pixels per rewarded video ad!
    COOLDOWN_SECONDS: 30,
    DAILY_STREAK_REWARDS: [10, 10, 20, 20, 30, 30, 50], // D1:10, D2:10, D3:20, D4:20, D5:30, D6:30, D7:50
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