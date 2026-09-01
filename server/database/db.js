import Database from "libsql";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store db file in /tmp on Render (ephemeral is fine — we sync from cloud on boot)
const dbPath = process.env.NODE_ENV === "production"
  ? "/tmp/pixel_game.db"
  : path.join(__dirname, "pixel_game.db");

// Build connection options
const tursoUrl = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "").trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "").trim();

const isTurso = tursoUrl.startsWith("libsql://") && tursoToken.length > 0;

const dbOptions = isTurso
  ? { syncUrl: tursoUrl, authToken: tursoToken, syncInterval: 60000 }
  : {};

if (isTurso) {
  console.log("🌩️  Turso Cloud LibSQL detected. Syncing on boot from:", tursoUrl);
} else {
  console.log("💾 No Turso env vars found. Using local SQLite at:", dbPath);
  console.log("   Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Render for persistent storage.");
}

// Open the database
export let db = new Database(dbPath, dbOptions);

try {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
} catch (e) {}

// CRITICAL: sync FROM Turso cloud BEFORE touching schema so data is restored
if (isTurso) {
  try {
    console.log("🔄 Pulling data from Turso Cloud...");
    db.sync();
    console.log("✅ Turso sync complete. Existing data restored.");
  } catch (syncErr) {
    console.error("❌ Turso sync failed on boot:", syncErr.message);
    console.error("   Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on Render env vars.");
  }
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      wallet_address TEXT,
      completed_tasks TEXT DEFAULT '[]',
      pixel_balance INTEGER DEFAULT ${CONFIG.STARTER_FREE_PIXELS},
      bomb_balance INTEGER DEFAULT ${CONFIG.STARTER_FREE_BOMBS || 1},
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

    CREATE TABLE IF NOT EXISTS round_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      target_pixels INTEGER NOT NULL,
      reached_at INTEGER NOT NULL,
      total_users_count INTEGER NOT NULL,
      total_points_distributed REAL NOT NULL,
      snapshot_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_stats (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_points ON users(airdrop_points DESC);
    CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_pixels_coords ON pixels(x, y);
    CREATE INDEX IF NOT EXISTS idx_placements_created ON placements_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_round_snapshots_round ON round_snapshots(round_number);
  `);

  // Add missing columns to existing tables (migration safety)
  const safeAlter = (sql) => { try { db.exec(sql); } catch (e) {} };
  safeAlter("ALTER TABLE users ADD COLUMN wallet_address TEXT;");
  safeAlter("ALTER TABLE users ADD COLUMN completed_tasks TEXT DEFAULT '[]';");
  safeAlter("ALTER TABLE users ADD COLUMN bomb_balance INTEGER DEFAULT 1;");
  safeAlter("ALTER TABLE users ADD COLUMN fresh_pixels_placed INTEGER DEFAULT 0;");
  safeAlter("ALTER TABLE users ADD COLUMN recolored_pixels_placed INTEGER DEFAULT 0;");

  // Insert milestone rounds only if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM milestones").get().c;
  if (count === 0) {
    const ins = db.prepare("INSERT INTO milestones (round_number, target_pixels, status) VALUES (?, ?, ?)");
    db.transaction(() => {
      for (let r = 1; r <= CONFIG.ROUNDS.MAX_ROUNDS; r++) {
        ins.run(r, r * CONFIG.ROUNDS.PIXELS_PER_ROUND, r === 1 ? "ACTIVE" : "LOCKED");
      }
    })();
  }

  // Ensure global pixel counter exists
  const hasStat = db.prepare("SELECT 1 FROM system_stats WHERE key='total_pixels_placed'").get();
  if (!hasStat) {
    db.prepare("INSERT INTO system_stats (key, value) VALUES ('total_pixels_placed', '0')").run();
  }

  console.log(`✅ Database ready. ${isTurso ? "Turso Cloud" : "Local SQLite"} | Starter: ${CONFIG.STARTER_FREE_PIXELS}px + 1 bomb`);
}

// Expose sync function for periodic use in index.js
export function syncToCloud() {
  if (isTurso) {
    try {
      db.sync();
    } catch (e) {
      console.warn("Turso periodic sync warning:", e.message);
    }
  }
}