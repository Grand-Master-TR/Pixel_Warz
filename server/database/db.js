import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "pixel_game.db");

export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Initialize Database Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      pixel_balance INTEGER DEFAULT ${CONFIG.STARTER_FREE_PIXELS},
      total_pixels_placed INTEGER DEFAULT 0,
      fresh_pixels_placed INTEGER DEFAULT 0,
      recolored_pixels_placed INTEGER DEFAULT 0,
      airdrop_points REAL DEFAULT 0.0,
      referral_points REAL DEFAULT 0.0,
      referrer_id TEXT,
      daily_streak INTEGER DEFAULT 0,
      last_daily_claim INTEGER DEFAULT 0,
      last_ad_watch INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS pixels (
      pixel_index INTEGER PRIMARY KEY,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      color_index INTEGER NOT NULL,
      last_placed_by TEXT,
      last_placed_at INTEGER,
      recolor_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS placements_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      color_index INTEGER NOT NULL,
      is_recolor INTEGER NOT NULL,
      points_awarded REAL NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_stars INTEGER DEFAULT 0,
      pixels_awarded INTEGER DEFAULT 0,
      details TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS milestones (
      round_number INTEGER PRIMARY KEY,
      target_pixels INTEGER NOT NULL,
      reached_at INTEGER,
      status TEXT DEFAULT 'LOCKED'
    );

    CREATE TABLE IF NOT EXISTS system_stats (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_points ON users(airdrop_points DESC);
    CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_pixels_coords ON pixels(x, y);
    CREATE INDEX IF NOT EXISTS idx_placements_created ON placements_log(created_at DESC);
  `);

  // Initialize milestone rounds (1 to 50)
  const count = db.prepare("SELECT COUNT(*) as count FROM milestones").get().count;
  if (count === 0) {
    const insertMilestone = db.prepare(`
      INSERT INTO milestones (round_number, target_pixels, status)
      VALUES (?, ?, ?)
    `);
    const insertMany = db.transaction(() => {
      for (let r = 1; r <= CONFIG.ROUNDS.MAX_ROUNDS; r++) {
        const target = r * CONFIG.ROUNDS.PIXELS_PER_ROUND;
        insertMilestone.run(r, target, r === 1 ? "ACTIVE" : "LOCKED");
      }
    });
    insertMany();
  }

  // Initialize global stats
  const getStat = db.prepare("SELECT value FROM system_stats WHERE key = 'total_pixels_placed'").get();
  if (!getStat) {
    db.prepare("INSERT INTO system_stats (key, value) VALUES ('total_pixels_placed', '0')").run();
  }

  console.log(` Database initialized with ${CONFIG.STARTER_FREE_PIXELS} Starter Pixel.`);
}