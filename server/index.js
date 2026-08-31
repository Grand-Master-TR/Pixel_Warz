import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { CONFIG } from "./config.js";
import { initDatabase } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { canvasRouter } from "./routes/canvas.js";
import { userRouter } from "./routes/user.js";
import { storeRouter } from "./routes/store.js";
import { airdropRouter } from "./routes/airdrop.js";
import { initTelegramBot } from "./bot.js";

// Initialize Database & Canvas Buffer
initDatabase();
canvasManager.init();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// WebSocket Server for Real-Time Canvas Multiplayer
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws, req) => {
  clients.add(ws);
  // Send connection welcome with connected count
  ws.send(JSON.stringify({ type: "INIT_CONNECTED", onlineCount: clients.size }));

  // Broadcast online count
  broadcastOnlineCount();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastOnlineCount();
  });
});

function broadcastOnlineCount() {
  const payload = JSON.stringify({ type: "ONLINE_COUNT", count: clients.size });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Function to broadcast batch pixel placements to all connected players
function broadcastPixelUpdates(pixels) {
  if (!pixels || pixels.length === 0) return;
  const payload = JSON.stringify({
    type: "PIXELS_PLACED",
    pixels: pixels, // array of { x, y, colorIndex, isRecolor, lastPlacedBy, timestamp }
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

app.set("broadcastPixelUpdates", broadcastPixelUpdates);

// API Routes
app.use("/api/canvas", canvasRouter);
app.use("/api/user", userRouter);
app.use("/api/store", storeRouter);
app.use("/api/airdrop", airdropRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    onlinePlayers: clients.size,
    timestamp: new Date().toISOString()
  });
});

// Periodic Snapshot Saver (every 30s)
setInterval(() => {
  if (canvasManager.dirty) {
    canvasManager.saveSnapshot();
  }
}, 30000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Saving canvas state before exit...");
  canvasManager.saveSnapshot();
  process.exit(0);
});

// Start Server & Bot
server.listen(CONFIG.PORT, () => {
  console.log(`🚀 Pixel Wars Game Server running on port ${CONFIG.PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`🎨 1M Canvas initialized (1000 x 1000). Ready for players!`);
  
  // Start Bot
  initTelegramBot();
});
