import crypto from "crypto";
import { CONFIG } from "../config.js";
import { db } from "../database/db.js";

const JWT_SECRET = process.env.JWT_SECRET || (CONFIG.BOT_TOKEN !== "DEMO_BOT_TOKEN" ? CONFIG.BOT_TOKEN : "pixel_wars_secure_fallback_key_2026");

// Generate a cryptographically signed HMAC auth token for session authentication
export function generateAuthToken(userId) {
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

// Verify HMAC auth token
export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [userId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return null; // Expired
    }

    const payload = `${userId}.${expiresAtStr}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return userId;
    }
  } catch (err) {
    return null;
  }

  return null;
}

// Express Middleware to authenticate and protect routes
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers["x-auth-token"];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  const authenticatedUserId = verifyAuthToken(token);

  if (!authenticatedUserId) {
    // In local development or testing only
    if (CONFIG.NODE_ENV === "development" && req.body?.userId) {
      req.userId = req.body.userId;
      return next();
    }
    return res.status(401).json({ error: "Unauthorized: Invalid or expired session token." });
  }

  req.userId = authenticatedUserId;
  next();
}

// Validate Telegram Mini App initData string with SHA256 HMAC
export function validateTelegramInitData(initData) {
  if (!initData) return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return null;

    urlParams.delete("hash");

    const params = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();
    const dataCheckString = params.join("\n");

    // Allow dev mock user only in development mode
    if (CONFIG.NODE_ENV === "development" && CONFIG.BOT_TOKEN === "DEMO_BOT_TOKEN") {
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
  } else {
    if (tgUser.username !== user.username || tgUser.first_name !== user.first_name) {
      db.prepare("UPDATE users SET username = ?, first_name = ? WHERE id = ?")
        .run(tgUser.username || null, tgUser.first_name || "Pixel Warrior", userId);
    }
  }

  return user;
}