import express from "express";
import { canvasManager } from "../services/canvasManager.js";
import { airdropEngine } from "../services/airdropEngine.js";
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

// Inspect a single pixel at (x, y)
canvasRouter.get("/pixel-info/:x/:y", (req, res) => {
  const x = parseInt(req.params.x, 10);
  const y = parseInt(req.params.y, 10);
  if (isNaN(x) || isNaN(y)) {
    return res.status(400).json({ error: "Invalid coordinates." });
  }

  const info = canvasManager.getPixelInfo(x, y);
  if (!info) {
    return res.status(404).json({ error: "Coordinates out of bounds (0-999)." });
  }

  res.json(info);
});

// Batch place pixels
canvasRouter.post("/place-pixels", (req, res) => {
  const { userId, pixels } = req.body;
  if (!userId || !pixels || !Array.isArray(pixels)) {
    return res.status(400).json({ error: "userId and pixels array are required." });
  }

  try {
    const result = airdropEngine.processPixelPlacements(userId, pixels);
    
    // Broadcast updates via WebSocket if attached to req.app
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
