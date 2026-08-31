/**
 * AdsGram SDK Integration Helper for Rewarded Video Ads
 * Block ID: 45460
 */

export const adsgram = {
  // Initialize and trigger a rewarded video ad
  async showRewardedVideo(blockId = null) {
    const activeBlockId = blockId || import.meta.env.VITE_ADSGRAM_BLOCK_ID || "45460";

    return new Promise((resolve, reject) => {
      // If AdsGram script is loaded in Telegram environment
      if (window.Adsgram) {
        try {
          const AdController = window.Adsgram.init({
            blockId: activeBlockId.toString(),
            debug: false,
          });

          AdController.show()
            .then((result) => {
              // User successfully completed the ad
              if (result.done) {
                resolve({ success: true, rewardClaimed: true });
              } else {
                reject(new Error("Ad was skipped or closed before completion."));
              }
            })
            .catch((err) => {
              console.warn("AdsGram show error:", err);
              reject(new Error(err?.description || "Ad playback error. Try again later."));
            });
        } catch (initErr) {
          console.error("AdsGram init error:", initErr);
          reject(new Error("Failed to initialize AdsGram video player."));
        }
      } else {
        // Fallback simulation for local desktop development / browser testing
        console.log("🎬 Simulated Rewarded Video Ad playing (3s)...");
        setTimeout(() => {
          resolve({ success: true, rewardClaimed: true, simulated: true });
        }, 3000);
      }
    });
  }
};