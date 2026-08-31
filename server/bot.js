import { Bot, InlineKeyboard } from "grammy";
import { CONFIG } from "./config.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser } from "./services/auth.js";

export function initTelegramBot() {
  if (
    !CONFIG.BOT_TOKEN ||
    CONFIG.BOT_TOKEN === "DEMO_BOT_TOKEN" ||
    CONFIG.BOT_TOKEN.startsWith("your_telegram_")
  ) {
    console.log("ℹ️ Telegram Bot running in DEMO mode (Provide real BOT_TOKEN in .env to enable live bot polling).");
    return null;
  }

  const bot = new Bot(CONFIG.BOT_TOKEN);

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
      `🔥 1 Million Real-time Canvas. Place pixels, conquer territory, and claim your share of the **50-Round Milestone Airdrop**!\n\n` +
      `🎁 **Your Free Starter Gift:** 1 Free Pixel is ready in your inventory to make your first mark!\n` +
      `🎯 **Rewards:**\n` +
      `• Fresh Pixel: +1.0 Airdrop Point\n` +
      `• Overwrite/Recolor: +1.5 Airdrop Points (50% bonus!)\n` +
      `• Referrals: Earn 10% of all points your friends accumulate forever!\n\n` +
      `⭐ Get more pixels with Telegram Stars (1 Star = 10 Pixels) or watch quick ads to keep painting!\n\n` +
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

    console.log(` Telegram Stars payment received: ${payment.total_amount} XTR from user ${userId}`);

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