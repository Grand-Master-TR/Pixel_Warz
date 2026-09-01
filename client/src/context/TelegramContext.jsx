import React, { createContext, useContext, useEffect, useState } from "react";

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [initData, setInitData] = useState("");
  const [startParam, setStartParam] = useState(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (webApp && webApp.initData) {
      setTg(webApp);
      setIsTelegram(true);
      webApp.ready();
      webApp.expand();
      
      // Prevent accidental closing on swipe down while dragging canvas
      try {
        if (webApp.disableVerticalSwipes) {
          webApp.disableVerticalSwipes();
        }
      } catch (e) {}

      // Set header & background color
      try {
        webApp.setHeaderColor("#0a0b0e");
        webApp.setBackgroundColor("#0a0b0e");
        webApp.enableClosingConfirmation();
      } catch (e) {}

      setInitData(webApp.initData);

      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
      }

      // Check startapp referral payload (e.g. ?startapp=ref_12345)
      const startParamVal = webApp.initDataUnsafe?.start_param || null;
      setStartParam(startParamVal);
    } else {
      // Browser / Local Dev simulation
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get("startapp") || urlParams.get("ref");
      setStartParam(refFromUrl);

      // Simulated local test user
      const storedDevId = localStorage.getItem("dev_user_id") || `dev_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("dev_user_id", storedDevId);
      
      setUser({
        id: storedDevId,
        username: `warrior_${storedDevId.slice(-4)}`,
        first_name: "Pixel Commander",
      });
      setIsTelegram(false);
    }
  }, []);

  // Haptic feedback wrappers
  const haptic = {
    impact: (style = "light") => {
      try {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
      } catch (e) {}
    },
    notification: (type = "success") => {
      try {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
        }
      } catch (e) {}
    },
    selection: () => {
      try {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
      } catch (e) {}
    },
  };

  // Open Telegram Channel, Group or bot link natively
  const openTelegramLink = (url) => {
    try {
      if (window.Telegram?.WebApp?.openTelegramLink && url.includes("t.me")) {
        window.Telegram.WebApp.openTelegramLink(url);
      } else if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  // 1-Click Share Referral link inside Telegram
  const shareTelegramLink = (url, text) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  // Open Telegram Stars Invoice
  const openInvoice = (invoiceUrl, callback) => {
    if (window.Telegram?.WebApp?.openInvoice) {
      window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
        if (callback) callback(status);
      });
    } else {
      console.log("Mock opening invoice:", invoiceUrl);
      if (callback) callback("paid");
    }
  };

  return (
    <TelegramContext.Provider
      value={{
        tg,
        user,
        initData,
        startParam,
        isTelegram,
        haptic,
        openTelegramLink,
        shareTelegramLink,
        openInvoice,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}