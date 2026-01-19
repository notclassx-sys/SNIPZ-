
/**
 * SNIPX AD-BRIDGE SERVICE
 * Communicates with the native Android WebView JavascriptInterface.
 * Note: AdMob IDs are managed exclusively in the Android native layer.
 */

export interface AdMobBridge {
  showBanner: () => void;
  hideBanner: () => void;
  showInterstitial: () => void;
  showRewarded: () => void;
}

declare global {
  interface Window {
    AndroidAdBridge?: AdMobBridge;
  }
}

class AdService {
  private lastInterstitialTime: number = 0;
  private readonly INTERSTITIAL_COOLDOWN = 180000; // 3 minutes frequency limit

  /**
   * Triggers the bottom banner via the Android bridge.
   * IDs are handled natively in Java/Kotlin.
   */
  initBanner() {
    if (window.AndroidAdBridge) {
      console.log(`[AdMob] Triggering Native Banner`);
      window.AndroidAdBridge.showBanner();
    }
  }

  /**
   * Triggers an interstitial ad request to the native layer.
   * Subject to a 3-minute cooldown on the JS side to minimize bridge noise.
   */
  requestInterstitial() {
    const now = Date.now();
    if (now - this.lastInterstitialTime > this.INTERSTITIAL_COOLDOWN) {
      if (window.AndroidAdBridge) {
        console.log(`[AdMob] Triggering Native Interstitial`);
        window.AndroidAdBridge.showInterstitial();
        this.lastInterstitialTime = now;
        return true;
      }
    } else {
      const wait = Math.round((this.INTERSTITIAL_COOLDOWN - (now - this.lastInterstitialTime)) / 1000);
      console.log(`[AdMob] Interstitial throttled in JS. Available in: ${wait}s`);
    }
    return false;
  }

  /**
   * Triggers a rewarded ad request to the native layer.
   * Typically triggered by specific user action in the Profile tab.
   */
  requestRewarded() {
    if (window.AndroidAdBridge) {
      console.log(`[AdMob] Triggering Native Rewarded`);
      window.AndroidAdBridge.showRewarded();
      return true;
    }
    return false;
  }
}

export const adService = new AdService();
