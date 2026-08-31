# 🎨 Pixel Wars - Telegram 1 Million Pixel Canvas Mini Game

A high-performance real-time multiplayer Telegram Mini App (TMA) featuring a **1,000,000-pixel canvas** ($1000 \times 1000$), dynamic pixel economy, **Telegram Stars** monetization, **AdsGram** rewarded video ads, **1.5x recoloring rewards**, a **10% passive referral system**, and a **50-Round Milestone Airdrop system** (scaling up to 500 Million total pixels placed).

Designed from first principles to run on **100% Free-Tier Cloud Services**.

---

## 🌟 Key Game Mechanics & Architecture

### 1. 1,000,000 Pixel Canvas ($1000 \times 1000$)
- **Ultra-Lightweight 1MB State**: Indexed 32-color palette allows storing the entire canvas in a 1 Megabyte `Uint8Array`.
- **Multi-Pixel Batch Placement**: Players can paint as many pixels as they want in a single batch and place them all together.
- **Inspect Mode**: Tap any coordinate $(X, Y)$ to view pixel history, last conqueror, timestamp, and how many times it has been overwritten.
- **High-Performance Viewport**: Smooth pan, pinch-to-zoom ($0.2\times$ to $50\times$), live 1M radar minimap, and crisp pixel grid.

### 2. Economy & Airdrop Points Engine
- **Pixel Pricing**:
  - **Telegram Stars**: 1 Star = 10 Pixels (e.g. 1 Star $\to$ 10 px, 10 Stars $\to$ 100 px, 50 Stars $\to$ 550 px (+10%), 100 Stars $\to$ 1200 px (+20%), 500 Stars $\to$ 6500 px (+30%)).
  - **AdsGram Ads**: Watch 1 video ad $\to$ Receive 1 Free Pixel (with 30s cooldown timer).
  - **Daily Check-in Streak**: Day 1 = +5 Pixels up to Day 7 = +35 Pixels.
- **Airdrop Points**:
  - **Fresh Pixel**: +1.0 Airdrop Point.
  - **Recolored / Overwritten Pixel**: **+1.5 Airdrop Points** (50% bonus reward!).
- **10% Passive Referral System**:
  - Whenever an invited player earns $P$ airdrop points, their referrer automatically receives $+0.10 \times P$ points without deducting anything from the friend.
- **50-Round Milestone Airdrop**:
  - Global Total Pixels Placed counter advances round by round:
    - Round 1: 10,000,000 Pixels
    - Round 2: 20,000,000 Pixels
    - ...
    - Round 50: 500,000,000 Pixels!
  - Real-time milestone tracker, progress bar, and top 50 leaderboard.

---

## 📁 Project Structure

```
telegram-pixel-game/
├── client/                     # Vite + React + Tailwind Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/         # PixelCanvas, PaletteBar, PendingTray, MiniMap, PixelInspector
│   │   │   ├── store/          # StarsShop, AdsGramPlayer, DailyClaim
│   │   │   ├── airdrop/        # MilestoneProgress, StatsCard, Leaderboard, ActivityFeed
│   │   │   ├── referrals/      # ReferralHub
│   │   │   └── layout/         # Header, Navigation
│   │   ├── context/            # TelegramContext & GameContext
│   │   ├── services/           # REST API, WebSocket, AdsGram SDK
│   │   └── utils/              # 32-Color Palette & Hex conversions
│   └── package.json
├── server/                     # Node.js + Express + WebSocket + SQLite Backend
│   ├── database/               # SQLite DB & canvas binary snapshots
│   ├── services/               # CanvasManager, AirdropEngine, StoreEngine, Auth
│   ├── routes/                 # Canvas, User, Store, Airdrop REST endpoints
│   ├── bot.js                  # Telegram Bot (grammY) & Stars Payment Handlers
│   ├── config.js               # Game constants, palette, packages, milestones
│   ├── index.js                # Server entry point & WebSocket hub
│   └── test.js                 # Automated backend test suite
└── README.md
```

---

## 🚀 Quickstart - Running Locally

### 1. Backend Setup
```bash
cd server
npm install
npm run test     # Run automated test suite
npm start        # Starts server on http://localhost:3001
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev      # Starts Vite on http://localhost:5173
```

Open `http://localhost:5173` in your browser. The app runs in simulated Telegram developer mode with starter pixels and simulated Stars purchases.

---

## 🌐 Deploying 100% Free to Production

### 1. Deploy Frontend (100% Free on Vercel or Cloudflare Pages)
1. Push the `client/` folder to GitHub.
2. Link the repository to [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com).
3. Set Build Command: `npm run build` and Output Directory: `dist`.
4. Set Environment Variables:
   - `VITE_API_URL=https://your-backend-domain.onrender.com/api`
   - `VITE_WS_URL=wss://your-backend-domain.onrender.com/ws`
   - `VITE_ADSGRAM_BLOCK_ID=your_adsgram_block_id`

### 2. Deploy Backend (100% Free on Render / Railway / Koyeb)
1. Push the `server/` folder to GitHub.
2. Create a Web Service on [Render](https://render.com) (Free Tier) or [Koyeb](https://www.koyeb.com).
3. Set Build Command: `npm install` and Start Command: `node index.js`.
4. Set Environment Variables:
   - `PORT=3001`
   - `NODE_ENV=production`
   - `BOT_TOKEN=your_telegram_bot_token`
   - `WEBAPP_URL=https://your-frontend-domain.vercel.app`

---

## 🤖 Telegram Bot & Stars Integration Guide

### Step 1: Create Bot via @BotFather
1. Open [@BotFather](https://t.me/BotFather) on Telegram.
2. Send `/newbot`, choose a name and username (e.g. `pixel_wars_bot`).
3. Copy the **HTTP API Token** and paste it into `server/.env` (`BOT_TOKEN`).

### Step 2: Configure WebApp Menu Button
1. In @BotFather, send `/setmenubutton`.
2. Select your bot, then enter your production frontend URL (e.g. `https://your-frontend.vercel.app`).
3. Set button title: `🎨 Play Pixel Wars`.

### Step 3: Enable Telegram Stars Payments
- Telegram Stars requires zero merchant verification. Invoices generated with currency `'XTR'` are processed natively by Telegram!
- When players purchase Stars packages, Telegram invokes `pre_checkout_query` and `message:successful_payment`, and `server/bot.js` automatically credits pixels in real time!

### Step 4: AdsGram Ad Network Setup
1. Register on [AdsGram](https://adsgram.ai).
2. Create a **Rewarded Video Ad** block.
3. Paste the Block ID into `client/.env` (`VITE_ADSGRAM_BLOCK_ID`).