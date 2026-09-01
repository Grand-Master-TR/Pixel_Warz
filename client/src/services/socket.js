/**
 * WebSocket Real-Time Client for Pixel Wars
 * Connects to Render WebSocket backend
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.isConnected = false;
  }

  connect() {
    const defaultWs = "wss://pixel-warz.onrender.com/ws";
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWs;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("📡 Connected to Pixel Wars Real-time WebSocket Server");
        this.isConnected = true;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && this.listeners.has(data.type)) {
            for (const cb of this.listeners.get(data.type)) {
              cb(data);
            }
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        // Auto-reconnect with exponential backoff
        this.reconnectTimer = setTimeout(() => this.connect(), 4000);
      };

      this.ws.onerror = (err) => {
        console.warn("WS connection error:", err.message || "Connection failed");
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);

    return () => {
      if (this.listeners.has(type)) {
        this.listeners.get(type).delete(callback);
      }
    };
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socket = new WebSocketClient();