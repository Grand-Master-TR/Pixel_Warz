import express from "express";
import { canvasManager } from "../services/canvasManager.js";
import { airdropEngine } from "../services/airdropEngine.js";
import { requireAuth } from "../services/auth.js";
import { CONFIG } from "../config.js";

export const canvasRouter = express.Router();

// Get full 1MB Canvas as binary array buffer
canvasRouter.get("/binary", (req, res) => {
  const buffer = canvasManager.getBuffer();
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "no-cache");
  res.send(Buffer.from(buffer.buffer));
});

// Get Canvas Metadata and Palette
canvasRouter.get("/state", (req, res) => {
  res.json({
    width: CONFIG.CANVAS_WIDTH,
    height: CONFIG.CANVAS_HEIGHT,
    totalPixels: CONFIG.TOTAL_CANVAS_PIXELS,
    palette: CONFIG.PALETTE,
    rules: {
      freshPixelPoints: CONFIG.POINTS.FRESH_PIXEL,
      recolorPixelPoints: CONFIG.POINTS.RECOLOR_PIXEL,
      referralRate: CONFIG.POINTS.REFERRAL_RATE,
    }
  });
});

// Inspect a single pixel at (x, y) with strict integer bounds check
canvasRouter.get("/pixel-info/:x/:y", (req, res) => {
  const x = parseInt(req.params.x, 10);
  const y = parseInt(req.params.y, 10);

  if (isNaN(x) || isNaN(y) || x < 0 || x >= CONFIG.CANVAS_WIDTH || y < 0 || y >= CONFIG.CANVAS_HEIGHT) {
    return res.status(400).json({ error: "Coordinates out of bounds (0 to 999)." });
  }

  const info = canvasManager.getPixelInfo(x, y);
  if (!info) {
    return res.status(404).json({ error: "Pixel info not found." });
  }

  res.json(info);
});

// Batch place pixels or drop 3x3 Paint Bomb (Protected with requireAuth & Strict Input Sanitization)
canvasRouter.post("/place-pixels", requireAuth, (req, res) => {
  const userId = req.userId;
  const { pixels, useBomb } = req.body;

  if (!pixels || !Array.isArray(pixels)) {
    return res.status(400).json({ error: "Invalid payload: pixels array required." });
  }

  // Prevent memory spikes: Maximum 500 pixels in a single batch request
  if (pixels.length === 0 || pixels.length > 500) {
    return res.status(400).json({ error: "Batch size must be between 1 and 500 pixels." });
  }

  // Deduplicate and validate each pixel coordinate & color
  const sanitizedMap = new Map();
  for (const p of pixels) {
    const x = parseInt(p.x, 10);
    const y = parseInt(p.y, 10);
    const colorIndex = parseInt(p.colorIndex, 10);

    if (isNaN(x) || isNaN(y) || isNaN(colorIndex)) continue;
    if (x < 0 || x >= CONFIG.CANVAS_WIDTH || y < 0 || y >= CONFIG.CANVAS_HEIGHT) continue;
    if (colorIndex < 0 || colorIndex >= CONFIG.PALETTE.length) continue;

    sanitizedMap.set(`${x}_${y}`, { x, y, colorIndex });
  }

  const sanitizedPixels = Array.from(sanitizedMap.values());
  if (sanitizedPixels.length === 0) {
    return res.status(400).json({ error: "No valid pixels provided in batch." });
  }

  try {
    const result = airdropEngine.processPixelPlacements(userId, sanitizedPixels, Boolean(useBomb));
    
    // Broadcast updates via WebSocket
    if (req.app.get("broadcastPixelUpdates")) {
      req.app.get("broadcastPixelUpdates")(result.appliedPixels);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});