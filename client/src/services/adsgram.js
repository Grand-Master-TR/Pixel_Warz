// AdsGram Rewarded Video Ad Controller Wrapper
export class AdsGramService {
  constructor(blockId = "int-1234") {
    this.blockId = blockId;
    this.adController = null;
    this.isInitialized = false;
  }

  init() {
    if (typeof window !== "undefined" && window.Adsgram) {
      try {
        const idToUse = this.blockId && (this.blockId.startsWith("int-") || !isNaN(Number(this.blockId)))
          ? this.blockId
          : "int-1234";

        this.adController = window.Adsgram.init({
          blockId: idToUse,
          debug: false,
        });
        this.isInitialized = true;
        console.log("📺 AdsGram SDK Initialized with block:", idToUse);
      } catch (err) {
        console.warn("⚠️ AdsGram init notice:", err.message);
      }
    }
  }

  async showRewardedAd() {
    // If AdsGram SDK is present and running in Telegram
    if (this.adController) {
      try {
        const res = await this.adController.show();
        if (res && res.done) {
          return { success: true };
        }
        return { success: false, reason: "Ad closed early or not completed" };
      } catch (err) {
        console.warn("Adsgram show fallback:", err?.message || err);
      }
    }

    // Fallback Simulator (for web browser dev testing or fallback)
    return new Promise((resolve) => {
      console.log("🎬 Simulating Rewarded Video Ad (2 seconds)...");
      setTimeout(() => {
        resolve({ success: true, simulated: true });
      }, 2000);
    });
  }
}

export const adsgram = new AdsGramService(import.meta.env.VITE_ADSGRAM_BLOCK_ID || "int-1234");