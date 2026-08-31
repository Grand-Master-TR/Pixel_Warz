import crypto from "crypto";
import { CONFIG } from "../config.js";
import { db } from "../database/db.js";

// Validate Telegram Mini App initData string
export function validateTelegramInitData(initData) {
  if (!initData) return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return null;

    urlParams.delete("hash");

    // Sort alphabetically
    const params = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join("\n");

    // If development or demo token, allow test user
    if (CONFIG.BOT_TOKEN === "DEMO_BOT_TOKEN" || CONFIG.NODE_ENV === "development") {
      const userStr = urlParams.get("user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    }

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(CONFIG.BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash === hash) {
      const userStr = urlParams.get("user");
      return userStr ? JSON.parse(userStr) : null;
    }
  } catch (err) {
    console.error("Auth initData validation error:", err.message);
  }

  return null;
}

// Get or create user in SQLite database
export function getOrCreateUser(tgUser, referrerId = null) {
  if (!tgUser || !tgUser.id) {
    throw new Error("Invalid Telegram user data.");
  }

  const userId = tgUser.id.toString();
  let user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  if (!user) {
    // Check referrer valid
    let validReferrer = null;
    if (referrerId && referrerId !== userId) {
      const refUser = db.prepare("SELECT id FROM users WHERE id = ?").get(referrerId.toString());
      if (refUser) {
        validReferrer = refUser.id;
      }
    }

    db.prepare(`
      INSERT INTO users (id, username, first_name, pixel_balance, referrer_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tgUser.username || null, tgUser.first_name || "Pixel Warrior", CONFIG.STARTER_FREE_PIXELS, validReferrer);

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    console.log(` Created new player: ${user.first_name} (@${user.username || "anon"}) with ${CONFIG.STARTER_FREE_PIXELS} Free Starter Pixels!`);
  } else {
    // Update username if changed
    if (tgUser.username !== user.username || tgUser.first_name !== user.first_name) {
      db.prepare("UPDATE users SET username = ?, first_name = ? WHERE id = ?")
        .run(tgUser.username || null, tgUser.first_name || "Pixel Warrior", userId);
    }
  }

  return user;
}