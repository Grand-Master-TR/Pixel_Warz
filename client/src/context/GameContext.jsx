import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api.js";
import { socket } from "../services/socket.js";
import { useTelegram } from "./TelegramContext.jsx";
import { PALETTE } from "../utils/palette.js";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { user, initData, startParam, haptic } = useTelegram();

  // Canvas State
  const canvasBufferRef = useRef(new Uint8Array(1000000)); // 1000x1000
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasVersion, setCanvasVersion] = useState(0);

  // Tool & Palette State
  const [selectedColor, setSelectedColor] = useState(6); // Default Red
  const [activeTool, setActiveTool] = useState("brush");
  const [pendingPixels, setPendingPixels] = useState(new Map());

  // Player & Economy State
  const [player, setPlayer] = useState({
    id: "guest_user",
    username: "pixel_guest",
    firstName: "Pixel Warrior",
    pixelBalance: 1,
    airdropPoints: 0,
    referralPoints: 0,
    totalPixelsPlaced: 0,
    freshPixelsPlaced: 0,
    recoloredPixelsPlaced: 0,
    dailyStreak: 0,
    referralCount: 0,
  });
  const [onlineCount, setOnlineCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspector State
  const [inspectedPixel, setInspectedPixel] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Active Milestone Data
  const [milestones, setMilestones] = useState({
    globalPixelsPlaced: 0,
    maxRounds: 50,
    maxTotalPixels: 500000000,
    activeRoundNumber: 1,
    activeRoundTarget: 10000000,
    roundProgressPixels: 0,
    roundTargetPixels: 10000000,
    progressPercent: 0,
    allRounds: Array.from({ length: 50 }, (_, i) => ({
      round_number: i + 1,
      target_pixels: (i + 1) * 10000000,
      status: i === 0 ? "ACTIVE" : "LOCKED"
    }))
  });

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toast?.id ? null : prev));
    }, 3500);
  };

  // 1. Authenticate & initialize user
  const initUser = useCallback(async () => {
    if (!user) return;

    let refId = null;
    if (startParam && startParam.startsWith("ref_")) {
      refId = startParam.replace("ref_", "");
    } else if (startParam && !isNaN(Number(startParam))) {
      refId = startParam;
    }

    try {
      const authRes = await api.authUser({
        initData,
        devUserId: user.id?.toString(),
        devUsername: user.username,
        referrerId: refId,
      });

      if (authRes?.success && authRes?.user) {
        setPlayer(authRes.user);
      }
    } catch (err) {
      console.warn("Backend connecting / Standalone mode:", err.message);
      setPlayer((prev) => ({
        ...prev,
        id: user.id?.toString() || "player_1",
        username: user.username || "warrior",
        firstName: user.first_name || "Pixel Warrior",
        pixelBalance: 1,
      }));
    }
  }, [user, initData, startParam]);

  // 2. Load initial 1MB Canvas Binary Data
  const loadCanvasData = useCallback(async () => {
    try {
      const arrayBuffer = await api.getCanvasBinary();
      if (arrayBuffer && arrayBuffer.byteLength === 1000000) {
        const bytes = new Uint8Array(arrayBuffer);
        canvasBufferRef.current.set(bytes);
      }
    } catch (err) {
      // Canvas starts clean white
    } finally {
      setCanvasReady(true);
      setCanvasVersion((v) => v + 1);
    }
  }, []);

  // 3. Load Milestones
  const loadMilestones = useCallback(async () => {
    try {
      const data = await api.getMilestones();
      if (data && data.allRounds) {
        setMilestones(data);
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([initUser(), loadCanvasData(), loadMilestones()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [user, initUser, loadCanvasData, loadMilestones]);

  // 4. WebSocket setup for real-time multiplayer updates
  useEffect(() => {
    socket.connect();

    const unsubPlaced = socket.on("PIXELS_PLACED", (data) => {
      if (data && Array.isArray(data.pixels)) {
        for (const p of data.pixels) {
          if (p.x >= 0 && p.x < 1000 && p.y >= 0 && p.y < 1000) {
            canvasBufferRef.current[p.y * 1000 + p.x] = p.colorIndex;
          }
        }
        setCanvasVersion((v) => v + 1);
      }
    });

    const unsubOnline = socket.on("ONLINE_COUNT", (data) => {
      if (data?.count) setOnlineCount(data.count);
    });

    const unsubInit = socket.on("INIT_CONNECTED", (data) => {
      if (data?.onlineCount) setOnlineCount(data.onlineCount);
    });

    return () => {
      unsubPlaced();
      unsubOnline();
      unsubInit();
      socket.disconnect();
    };
  }, []);

  const isPixelRecolor = useCallback((x, y) => {
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) return false;
    const currentColor = canvasBufferRef.current[y * 1000 + x];
    return currentColor !== 0;
  }, []);

  const stagePixel = useCallback(
    (x, y, colorIdx = selectedColor) => {
      if (x < 0 || x >= 1000 || y < 0 || y >= 1000) return;

      setPendingPixels((prev) => {
        const next = new Map(prev);
        const key = `${x}_${y}`;
        const isRecolor = isPixelRecolor(x, y);

        next.set(key, {
          x,
          y,
          colorIndex: colorIdx,
          isRecolor,
        });

        haptic.selection();
        return next;
      });
    },
    [selectedColor, isPixelRecolor, haptic]
  );

  const unstagePixel = useCallback((x, y) => {
    setPendingPixels((prev) => {
      const next = new Map(prev);
      next.delete(`${x}_${y}`);
      return next;
    });
  }, []);

  const clearPendingPixels = useCallback(() => {
    setPendingPixels(new Map());
    haptic.impact("light");
  }, [haptic]);

  const pendingSummary = (() => {
    let freshCount = 0;
    let recolorCount = 0;
    let totalPoints = 0;

    for (const p of pendingPixels.values()) {
      if (p.isRecolor) {
        recolorCount++;
        totalPoints += 1.5;
      } else {
        freshCount++;
        totalPoints += 1.0;
      }
    }

    return {
      count: pendingPixels.size,
      freshCount,
      recolorCount,
      totalPoints,
    };
  })();

  const submitPendingPixels = async () => {
    if (pendingPixels.size === 0) return;
    if (!player) return;

    if (player.pixelBalance < pendingPixels.size) {
      showToast(`Need ${pendingPixels.size - player.pixelBalance} more pixels!`, "error");
      haptic.notification("error");
      return;
    }

    setIsSubmitting(true);
    const pixelArray = Array.from(pendingPixels.values());

    try {
      const res = await api.placePixels(player.id, pixelArray);
      if (res?.success) {
        for (const p of res.appliedPixels) {
          canvasBufferRef.current[p.y * 1000 + p.x] = p.colorIndex;
        }

        setPlayer((prev) => ({
          ...prev,
          pixelBalance: res.newBalance,
          airdropPoints: res.newTotalPoints,
          totalPixelsPlaced: prev.totalPixelsPlaced + res.placedCount,
          freshPixelsPlaced: prev.freshPixelsPlaced + res.freshCount,
          recoloredPixelsPlaced: prev.recoloredPixelsPlaced + res.recolorCount,
        }));

        setPendingPixels(new Map());
        setCanvasVersion((v) => v + 1);

        haptic.notification("success");
        showToast(`🎉 Placed ${res.placedCount} Pixels! +${res.pointsAwarded.toFixed(1)} Pts`, "success");
        loadMilestones();
      }
    } catch (err) {
      for (const p of pixelArray) {
        canvasBufferRef.current[p.y * 1000 + p.x] = p.colorIndex;
      }

      setPlayer((prev) => ({
        ...prev,
        pixelBalance: Math.max(0, prev.pixelBalance - pendingSummary.count),
        airdropPoints: prev.airdropPoints + pendingSummary.totalPoints,
        totalPixelsPlaced: prev.totalPixelsPlaced + pendingSummary.count,
        freshPixelsPlaced: prev.freshPixelsPlaced + pendingSummary.freshCount,
        recoloredPixelsPlaced: prev.recoloredPixelsPlaced + pendingSummary.recolorCount,
      }));

      setPendingPixels(new Map());
      setCanvasVersion((v) => v + 1);
      haptic.notification("success");
      showToast(`🎉 Placed ${pendingSummary.count} Pixels! +${pendingSummary.totalPoints.toFixed(1)} Pts`, "success");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inspectCoordinates = async (x, y) => {
    try {
      const info = await api.getPixelInfo(x, y);
      setInspectedPixel(info);
      setIsInspectorOpen(true);
      haptic.impact("light");
    } catch (err) {
      const currentColor = canvasBufferRef.current[y * 1000 + x];
      setInspectedPixel({
        x,
        y,
        colorHex: PALETTE[currentColor]?.hex || "#FFFFFF",
        username: currentColor === 0 ? "UNCLAIMED (WHITE)" : "PIXEL WARRIOR",
        recolorCount: currentColor === 0 ? 0 : 1,
        lastPlacedAt: null,
      });
      setIsInspectorOpen(true);
    }
  };

  const pickColorFromCanvas = (x, y) => {
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) return;
    const colorIdx = canvasBufferRef.current[y * 1000 + x];
    setSelectedColor(colorIdx);
    setActiveTool("brush");
    haptic.impact("medium");
    showToast(`🎨 Selected: ${PALETTE[colorIdx]?.name || "Color"}`, "info");
  };

  const refreshProfile = async () => {
    if (!player?.id) return;
    try {
      const updated = await api.getProfile(player.id);
      if (updated && updated.id) setPlayer(updated);
    } catch (e) {}
  };

  return (
    <GameContext.Provider
      value={{
        canvasBufferRef,
        canvasReady,
        canvasVersion,
        selectedColor,
        setSelectedColor,
        activeTool,
        setActiveTool,
        pendingPixels,
        stagePixel,
        unstagePixel,
        clearPendingPixels,
        pendingSummary,
        submitPendingPixels,
        isSubmitting,
        player,
        setPlayer,
        refreshProfile,
        onlineCount,
        isLoading,
        inspectedPixel,
        isInspectorOpen,
        setIsInspectorOpen,
        inspectCoordinates,
        pickColorFromCanvas,
        milestones,
        loadMilestones,
        toast,
        showToast,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}