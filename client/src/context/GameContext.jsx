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
  const [canvasVersion, setCanvasVersion] = useState(0); // Trigger canvas repaint

  // Tool & Palette State
  const [selectedColor, setSelectedColor] = useState(6); // Default Red
  const [activeTool, setActiveTool] = useState("brush"); // "brush" | "inspect" | "pipette"
  const [pendingPixels, setPendingPixels] = useState(new Map()); // Key: `${x}_${y}` -> { x, y, colorIndex, isRecolor }

  // Player & Economy State
  const [player, setPlayer] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspector State
  const [inspectedPixel, setInspectedPixel] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Active Milestone Data
  const [milestones, setMilestones] = useState(null);

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

      if (authRes.success) {
        setPlayer(authRes.user);
      }
    } catch (err) {
      console.error("Auth error:", err);
      showToast("Authentication failed", "error");
    }
  }, [user, initData, startParam]);

  // 2. Load initial 1MB Canvas Binary Data
  const loadCanvasData = useCallback(async () => {
    try {
      const arrayBuffer = await api.getCanvasBinary();
      const bytes = new Uint8Array(arrayBuffer);
      if (bytes.length === 1000000) {
        canvasBufferRef.current.set(bytes);
        setCanvasReady(true);
        setCanvasVersion((v) => v + 1);
      }
    } catch (err) {
      console.error("Canvas load error:", err);
      showToast("Failed to load canvas pixels", "error");
    }
  }, []);

  // 3. Load Milestones
  const loadMilestones = useCallback(async () => {
    try {
      const data = await api.getMilestones();
      setMilestones(data);
    } catch (err) {
      console.warn("Milestone fetch error:", err);
    }
  }, []);

  // Initialize on mount
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

  // Check if pixel at (x, y) is an overwrite / recolor
  const isPixelRecolor = useCallback((x, y) => {
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) return false;
    const currentColor = canvasBufferRef.current[y * 1000 + x];
    return currentColor !== 0; // Not white = already colored/placed
  }, []);

  // Stage a pixel into the pending tray
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

  // Remove a single staged pixel
  const unstagePixel = useCallback((x, y) => {
    setPendingPixels((prev) => {
      const next = new Map(prev);
      next.delete(`${x}_${y}`);
      return next;
    });
  }, []);

  // Clear all pending pixels
  const clearPendingPixels = useCallback(() => {
    setPendingPixels(new Map());
    haptic.impact("light");
  }, [haptic]);

  // Calculate estimated points breakdown
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

  // Submit batch pending pixels to server
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
      if (res.success) {
        // Update local buffer immediately
        for (const p of res.appliedPixels) {
          canvasBufferRef.current[p.y * 1000 + p.x] = p.colorIndex;
        }

        // Update player stats
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

        // Refresh milestones
        loadMilestones();
      }
    } catch (err) {
      console.error("Placement error:", err);
      showToast(err.message || "Failed to place pixels", "error");
      haptic.notification("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inspect a pixel
  const inspectCoordinates = async (x, y) => {
    try {
      const info = await api.getPixelInfo(x, y);
      setInspectedPixel(info);
      setIsInspectorOpen(true);
      haptic.impact("light");
    } catch (err) {
      console.warn("Inspector error:", err);
    }
  };

  // Pipette tool: pick color from canvas
  const pickColorFromCanvas = (x, y) => {
    if (x < 0 || x >= 1000 || y < 0 || y >= 1000) return;
    const colorIdx = canvasBufferRef.current[y * 1000 + x];
    setSelectedColor(colorIdx);
    setActiveTool("brush");
    haptic.impact("medium");
    showToast(`🎨 Selected: ${PALETTE[colorIdx]?.name || "Color"}`, "info");
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!player?.id) return;
    try {
      const updated = await api.getProfile(player.id);
      setPlayer(updated);
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
