import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { WebSocketServer, WebSocket } from "ws";
import { CONFIG } from "./config.js";
import { initDatabase, syncToCloud } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { canvasRouter } from "./routes/canvas.js";
import { userRouter } from "./routes/user.js";
import { storeRouter } from "./routes/store.js";
import { airdropRouter } from "./routes/airdrop.js";
import { initTelegramBot } from "./bot.js";

// Initialize Database (syncs from Turso cloud on boot if env vars set)
initDatabase();
// Load canvas pixel buffer from database
canvasManager.init();

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Rate Limiter: 150 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", globalLimiter);

// Pixel Placement: 40 batches/min
const placeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: "Pixel placement rate limit reached. Please wait a moment." },
});
app.use("/api/canvas/place-pixels", placeLimiter);

// WebSocket Server
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws) => {
  if (clients.size > 5000) { ws.close(1008, "Server capacity reached"); return; }
  clients.add(ws);
  ws.send(JSON.stringify({ type: "INIT_CONNECTED", onlineCount: clients.size }));
  broadcastOnlineCount();

  ws.on("message", (message) => {
    try {
      if (message.length > 512) return;
      const data = JSON.parse(message.toString());
      if (data.type === "PING") ws.send(JSON.stringify({ type: "PONG" }));
    } catch (e) {}
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastOnlineCount();
  });
});

function broadcastOnlineCount() {
  const payload = JSON.stringify({ type: "ONLINE_COUNT", count: clients.size });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function broadcastPixelUpdates(pixels) {
  if (!pixels || pixels.length === 0) return;
  const payload = JSON.stringify({ type: "PIXELS_PLACED", pixels });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

app.set("broadcastPixelUpdates", broadcastPixelUpdates);

// API Routes
app.use("/api/canvas", canvasRouter);
app.use("/api/user", userRouter);
app.use("/api/store", storeRouter);
app.use("/api/airdrop", airdropRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    onlinePlayers: clients.size,
    timestamp: new Date().toISOString(),
  });
});

// Sync to Turso cloud every 60 seconds (keeps cloud in sync with writes)
setInterval(() => {
  syncToCloud();
}, 60000);

// Graceful shutdown — final sync before exit
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Final sync to Turso cloud...");
  syncToCloud();
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received. Final sync to Turso cloud...");
  syncToCloud();
  process.exit(0);
});

// Start Server & Bot
server.listen(CONFIG.PORT, () => {
  console.log(`🛡️ Pixel Warz Server running on port ${CONFIG.PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`🎨 1M Canvas ready (1000x1000). Let the Warz begin!`);
  initTelegramBot();
});