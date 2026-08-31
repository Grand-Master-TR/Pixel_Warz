import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_PATH = path.join(__dirname, "../database/canvas_snapshot.bin");

class CanvasManager {
  constructor() {
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;
    this.totalPixels = CONFIG.TOTAL_CANVAS_PIXELS;
    // 1 Million bytes buffer in memory (each byte is a color index 0-31)
    this.buffer = new Uint8Array(this.totalPixels);
    this.dirty = false;
  }

  init() {
    console.log(" Initializing 1,000,000-pixel Canvas Buffer...");
    if (fs.existsSync(SNAPSHOT_PATH)) {
      try {
        const fileData = fs.readFileSync(SNAPSHOT_PATH);
        if (fileData.length === this.totalPixels) {
          this.buffer.set(fileData);
          console.log(" Loaded canvas snapshot from disk (1,000,000 bytes).");
          return;
        }
      } catch (err) {
        console.warn(" Failed to load snapshot, rebuilding from DB...", err.message);
      }
    }

    // Rebuild from SQLite DB
    const rows = db.prepare("SELECT pixel_index, color_index FROM pixels").all();
    for (const row of rows) {
      if (row.pixel_index >= 0 && row.pixel_index < this.totalPixels) {
        this.buffer[row.pixel_index] = row.color_index;
      }
    }
    console.log(` Restored ${rows.length} placed pixels from database into memory buffer.`);
    this.saveSnapshot();
  }

  saveSnapshot() {
    try {
      fs.writeFileSync(SNAPSHOT_PATH, Buffer.from(this.buffer.buffer));
      this.dirty = false;
      // console.log(" Canvas snapshot saved to disk.");
    } catch (err) {
      console.error(" Error saving canvas snapshot:", err.message);
    }
  }

  getBuffer() {
    return this.buffer;
  }

  getColor(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.buffer[y * this.width + x];
  }

  getPixelInfo(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const pixelIndex = y * this.width + x;
    const currentColor = this.buffer[pixelIndex];

    const row = db.prepare(`
      SELECT p.*, u.username, u.first_name 
      FROM pixels p
      LEFT JOIN users u ON p.last_placed_by = u.id
      WHERE p.pixel_index = ?
    `).get(pixelIndex);

    if (!row) {
      return {
        x,
        y,
        pixelIndex,
        colorIndex: currentColor,
        colorHex: CONFIG.PALETTE[currentColor] || "#FFFFFF",
        lastPlacedBy: null,
        username: "Unclaimed (White)",
        lastPlacedAt: null,
        recolorCount: 0,
        isPlaced: false,
      };
    }

    return {
      x,
      y,
      pixelIndex,
      colorIndex: row.color_index,
      colorHex: CONFIG.PALETTE[row.color_index] || "#FFFFFF",
      lastPlacedBy: row.last_placed_by,
      username: row.username || row.first_name || `User ${row.last_placed_by?.slice(0, 6)}`,
      lastPlacedAt: row.last_placed_at,
      recolorCount: row.recolor_count,
      isPlaced: true,
    };
  }

  // Check if pixel at (x, y) was previously placed
  isPixelAlreadyPlaced(x, y) {
    const pixelIndex = y * this.width + x;
    const currentColor = this.buffer[pixelIndex];
    // If currentColor != 0 (white) or exists in db
    if (currentColor !== 0) return true;
    const existing = db.prepare("SELECT color_index FROM pixels WHERE pixel_index = ?").get(pixelIndex);
    return !!existing;
  }

  // Update a single pixel memory and DB
  applyPixel(userId, x, y, colorIndex, timestamp = Math.floor(Date.now() / 1000)) {
    const pixelIndex = y * this.width + x;
    const prevColor = this.buffer[pixelIndex];
    
    // Check if it is a recolor (already placed before, or previously non-white)
    const existing = db.prepare("SELECT recolor_count FROM pixels WHERE pixel_index = ?").get(pixelIndex);
    const isRecolor = !!existing || prevColor !== 0;
    const newRecolorCount = existing ? (existing.recolor_count + 1) : (prevColor !== 0 ? 1 : 0);

    // Update memory buffer
    this.buffer[pixelIndex] = colorIndex;
    this.dirty = true;

    // Update SQLite
    db.prepare(`
      INSERT INTO pixels (pixel_index, x, y, color_index, last_placed_by, last_placed_at, recolor_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pixel_index) DO UPDATE SET
        color_index = excluded.color_index,
        last_placed_by = excluded.last_placed_by,
        last_placed_at = excluded.last_placed_at,
        recolor_count = excluded.recolor_count
    `).run(pixelIndex, x, y, colorIndex, userId, timestamp, newRecolorCount);

    return {
      x,
      y,
      pixelIndex,
      colorIndex,
      isRecolor,
      recolorCount: newRecolorCount,
      lastPlacedBy: userId,
      timestamp
    };
  }
}

export const canvasManager = new CanvasManager();
