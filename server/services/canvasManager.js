import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_JSON_PATH = path.join(__dirname, "../database/logo_pixels.json");

class CanvasManager {
  constructor() {
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;
    this.totalPixels = CONFIG.TOTAL_CANVAS_PIXELS;
    // In-memory 1M pixel buffer (color index per pixel)
    this.buffer = new Uint8Array(this.totalPixels);
    this.dirty = false;
  }

  init() {
    console.log("🎨 Initializing 1,000,000-pixel Canvas Buffer from database...");
    try {
      // 1. Check if official logo needs to be seeded
      const count = db.prepare("SELECT COUNT(*) as c FROM pixels WHERE last_placed_by = 'PIXEL_WARZ'").get().c;
      if (count === 0 && fs.existsSync(LOGO_JSON_PATH)) {
        console.log("🎨 Seeding Official PIXEL WARZ Logo at canvas center...");
        try {
          const logoData = JSON.parse(fs.readFileSync(LOGO_JSON_PATH, "utf8"));
          const now = Math.floor(Date.now() / 1000);
          const insertLogoPixel = db.prepare(`
            INSERT INTO pixels (pixel_index, x, y, color_index, last_placed_by, last_placed_at, recolor_count)
            VALUES (?, ?, ?, ?, 'PIXEL_WARZ', ?, 1)
            ON CONFLICT(pixel_index) DO UPDATE SET
              color_index = excluded.color_index,
              last_placed_by = excluded.last_placed_by,
              last_placed_at = excluded.last_placed_at
          `);

          const insertBatch = db.transaction(() => {
            for (const p of logoData) {
              const pixelIndex = p.y * this.width + p.x;
              insertLogoPixel.run(pixelIndex, p.x, p.y, p.colorIndex, now);
              this.buffer[pixelIndex] = p.colorIndex;
            }
          });
          insertBatch();
          console.log(`✅ Seeded ${logoData.length} PIXEL WARZ Logo pixels into canvas!`);
        } catch (seedErr) {
          console.warn("⚠️ Error seeding logo:", seedErr.message);
        }
      }

      // 2. Load all placed pixels from database into memory buffer
      const rows = db.prepare("SELECT pixel_index, color_index FROM pixels").all();
      for (const row of rows) {
        if (row.pixel_index >= 0 && row.pixel_index < this.totalPixels) {
          this.buffer[row.pixel_index] = row.color_index;
        }
      }
      console.log(`✅ Loaded ${rows.length} placed pixels from database into canvas buffer.`);
    } catch (err) {
      console.warn("⚠️ Could not load canvas pixels from DB:", err.message);
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
        x, y, pixelIndex,
        colorIndex: currentColor,
        colorHex: CONFIG.PALETTE[currentColor] || "#FFFFFF",
        lastPlacedBy: null,
        username: "Unclaimed (White)",
        lastPlacedAt: null,
        recolorCount: 0,
        isPlaced: false,
      };
    }

    const isSystem = row.last_placed_by === "PIXEL_WARZ";

    return {
      x, y, pixelIndex,
      colorIndex: row.color_index,
      colorHex: CONFIG.PALETTE[row.color_index] || "#FFFFFF",
      lastPlacedBy: row.last_placed_by,
      username: isSystem ? "⚔️ PIXEL WARZ OFFICIAL" : (row.username || row.first_name || `User ${row.last_placed_by?.slice(0, 6)}`),
      lastPlacedAt: row.last_placed_at,
      recolorCount: row.recolor_count,
      isPlaced: true,
    };
  }

  isPixelAlreadyPlaced(x, y) {
    const pixelIndex = y * this.width + x;
    return this.buffer[pixelIndex] !== 0;
  }

  applyPixel(userId, x, y, colorIndex, timestamp = Math.floor(Date.now() / 1000)) {
    const pixelIndex = y * this.width + x;
    const prevColor = this.buffer[pixelIndex];
    const existing = db.prepare("SELECT recolor_count FROM pixels WHERE pixel_index = ?").get(pixelIndex);
    const isRecolor = !!existing || prevColor !== 0;
    const newRecolorCount = existing ? (existing.recolor_count + 1) : (prevColor !== 0 ? 1 : 0);

    // Update memory buffer immediately
    this.buffer[pixelIndex] = colorIndex;
    this.dirty = true;

    // Write to database (this goes to Turso if configured)
    db.prepare(`
      INSERT INTO pixels (pixel_index, x, y, color_index, last_placed_by, last_placed_at, recolor_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pixel_index) DO UPDATE SET
        color_index = excluded.color_index,
        last_placed_by = excluded.last_placed_by,
        last_placed_at = excluded.last_placed_at,
        recolor_count = excluded.recolor_count
    `).run(pixelIndex, x, y, colorIndex, userId, timestamp, newRecolorCount);

    return { x, y, pixelIndex, colorIndex, isRecolor, recolorCount: newRecolorCount, lastPlacedBy: userId, timestamp };
  }
}

export const canvasManager = new CanvasManager();