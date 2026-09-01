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

// Generate an official Telegram Stars (XTR) invoice link for the Mini App
export async function createStarsInvoiceLink(userId, packageId) {
  const pkg = CONFIG.STARS_PACKAGES.find((p) => p.id === packageId);
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
    const invoiceLink = await bot.api.createInvoiceLink(
      `💎 ${pkg.pixels} Pixel Wars Pixels`,
      `Get ${pkg.pixels} pixels instantly in Pixel Wars to conquer territory and earn airdrop points!`,
      payload,
      "", // Provider token is empty string for Telegram Stars (XTR)
      "XTR", // Currency is strictly XTR for Telegram Stars
      [{ label: `${pkg.pixels} Pixels`, amount: pkg.stars }]
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
      .url("📢 Official Channel", "https://t.me/telegram")
      .switchInline("👥 Share Referral Link", `Play Pixel Wars with me! Use my link: https://t.me/${ctx.me.username}?startapp=ref_${user.id}`);

    await ctx.reply(
      `👾 **WELCOME TO PIXEL WARS!** 🎨\n\n` +
      `🔥 1 Million Real-time Canvas. Place pixels, conquer territory, and claim your share of the **50-Round (5 Billion Pixels) Milestone Airdrop**!\n\n` +
      `🎁 **Your Free Starter Gift:** 10 Free Pixels are ready in your inventory to make your first mark!\n` +
      `🎯 **10x Rewards:**\n` +
      `• Fresh Pixel: +10.0 Airdrop Points\n` +
      `• Overwrite/Recolor: +15.0 Airdrop Points (50% bonus!)\n` +
      `• Referrals: Earn 10% of all points your friends accumulate forever!\n\n` +
      `⭐ Get more pixels with Telegram Stars (1 Star = 100 Pixels) or watch quick ads (+10 Pixels each) to keep painting!\n\n` +
      `Tap below to enter the canvas! 👇`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  });

  // Handle Telegram Stars Pre-Checkout Query (Always approve for Stars)
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

      await ctx.reply(
        `🎉 **Payment Successful!**\n\n` +
        `💎 Added **+${result.pixelsAdded} Pixels** to your balance!\n` +
        `🎨 Your new balance: **${result.newBalance} Pixels**.\n\n` +
        `Go to the canvas and make your mark!`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("Error fulfilling Stars payment:", err);
      await ctx.reply("Your payment was received. Pixels will be credited shortly.");
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