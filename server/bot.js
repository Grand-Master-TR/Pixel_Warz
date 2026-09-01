import { Bot, InlineKeyboard } from "grammy";
import { CONFIG } from "./config.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser } from "./services/auth.js";

let botInstance = null;

export function getBot() {
  if (!botInstance && CONFIG.BOT_TOKEN && CONFIG.BOT_TOKEN !== "DEMO_BOT_TOKEN") {
    botInstance = new Bot(CONFIG.BOT_TOKEN.trim());
  }
  return botInstance;
}

// Generate an official Telegram Stars (XTR) invoice link for the Mini App (Pixels & Bombs)
export async function createStarsInvoiceLink(userId, packageId) {
  const pixelPkg = CONFIG.STARS_PACKAGES.find((p) => p.id === packageId);
  const bombPkg = CONFIG.STARS_BOMB_PACKAGES.find((p) => p.id === packageId);
  const pkg = pixelPkg || bombPkg;

  if (!pkg) throw new Error("Invalid package ID");

  const bot = getBot();
  if (!bot) {
    // Sandbox / Local fallback invoice link
    return {
      invoiceLink: `https://t.me/demo_pixel_wars_bot?start=invoice_${packageId}_${userId}`,
      isSimulation: true,
      package: pkg
    };
  }

  try {
    const payload = `${packageId}_${userId}_${Date.now()}`;
    const isBomb = Boolean(bombPkg);
    const title = isBomb ? `💣 ${pkg.bombs}x 3x3 Paint Bombs` : `💎 ${pkg.pixels} Pixel Wars Pixels`;
    const description = isBomb
      ? `Blast 3x3 areas (9 pixels in 1 tap) on the canvas to conquer territory and earn massive airdrop points!`
      : `Get ${pkg.pixels} pixels instantly in Pixel Wars to conquer territory and earn airdrop points!`;

    const invoiceLink = await bot.api.createInvoiceLink(
      title,
      description,
      payload,
      "", // Provider token is empty string for Telegram Stars (XTR)
      "XTR", // Currency is strictly XTR for Telegram Stars
      [{ label: isBomb ? `${pkg.bombs} Bombs` : `${pkg.pixels} Pixels`, amount: pkg.stars }]
    );

    return {
      invoiceLink,
      isSimulation: false,
      package: pkg
    };
  } catch (err) {
    console.error("Error creating Stars invoice link:", err);
    throw new Error(`Failed to create Stars invoice: ${err.message}`);
  }
}

export function initTelegramBot() {
  if (
    !CONFIG.BOT_TOKEN ||
    CONFIG.BOT_TOKEN === "DEMO_BOT_TOKEN" ||
    CONFIG.BOT_TOKEN.startsWith("your_telegram_")
  ) {
    console.log("ℹ️ Telegram Bot running in DEMO mode (Provide real BOT_TOKEN in .env to enable live bot polling).");
    return null;
  }

  const bot = getBot();

  // Command: /start [ref_12345]
  bot.command("start", async (ctx) => {
    const payload = ctx.match; // e.g. "ref_123456"
    let referrerId = null;
    if (payload && payload.startsWith("ref_")) {
      referrerId = payload.replace("ref_", "");
    }

    const tgUser = ctx.from;
    const user = getOrCreateUser(tgUser, referrerId);

    const keyboard = new InlineKeyboard()
      .webApp("👾 Play Pixel Wars", CONFIG.WEBAPP_URL)
      .row()
      .url("📢 Official Channel", "https://t.me/Pixel_Warz_Official")
      .switchInline("👥 Share Referral Link", `Play Pixel Wars with me! Use my link: https://t.me/${ctx.me.username}?startapp=ref_${user.id}`);

    await ctx.reply(
      `👾 **WELCOME TO PIXEL WARS!** 🎨\n\n` +
      `🔥 1 Million Real-time Canvas. Place pixels, drop 3x3 paint bombs, and claim your share of the **50-Round Milestone Airdrop**!\n\n` +
      `🎁 **Your Free Starter Gift:** 10 Free Pixels + 1 Free 3x3 Paint Bomb ready in your arsenal!\n` +
      `🎯 **Rewards:**\n` +
      `• Fresh Pixel: +10.0 Airdrop Points\n` +
      `• Overwrite/Recolor: +15.0 Airdrop Points (50% bonus!)\n` +
      `• Referrals: Earn 10% of all points your friends accumulate forever!\n\n` +
      `⭐ Get more pixels & bombs with Telegram Stars or complete tasks to earn free rewards!\n\n` +
      `Tap below to enter the canvas! 👇`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  });

  // Handle Telegram Stars Pre-Checkout Query
  bot.on("pre_checkout_query", async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (err) {
      console.error("Error answering pre_checkout_query:", err);
      await ctx.answerPreCheckoutQuery(false, { error_message: "Payment processing failed. Try again." });
    }
  });

  // Handle Successful Telegram Stars Payment
  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const payload = payment.invoice_payload;
    const userId = ctx.from.id.toString();

    console.log(`⭐ Telegram Stars payment received: ${payment.total_amount} XTR from user ${userId}`);

    try {
      const parts = payload.split("_");
      const packageId = `${parts[0]}_${parts[1]}`;
      const result = storeEngine.creditStarsPurchase(userId, packageId, payment.telegram_payment_charge_id);

      const itemCredited = result.isBomb
        ? `💣 Added **+${result.bombsAdded} Paint Bombs**`
        : `💎 Added **+${result.pixelsAdded} Pixels**`;

      await ctx.reply(
        `🎉 **Payment Successful!**\n\n` +
        `${itemCredited} to your inventory!\n\n` +
        `Go to the canvas and make your mark!`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("Error fulfilling Stars payment:", err);
      await ctx.reply("Your payment was received. Items will be credited shortly.");
    }
  });

  bot.start({
    onStart(botInfo) {
      console.log(`🤖 Telegram Bot @${botInfo.username} started successfully!`);
    }
  }).catch((err) => {
    console.warn("⚠️ Bot polling error:", err.message);
  });

  return bot;
}