import React, { useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { sound } from "../../services/sound.js";
import { api } from "../../services/api.js";
import { CheckCircle2, ExternalLink, Gift, Trophy } from "lucide-react";

export function TasksHub() {
  const { player, setPlayer, showToast } = useGame();
  const { openTelegramLink, haptic } = useTelegram();
  const [tasks] = useState([
    {
      id: "join_channel",
      title: "Join Official Telegram Channel",
      description: "Subscribe for instant announcements & giveaways",
      url: "https://t.me/Pixel_Warz_Official",
      rewardPixels: 20,
      icon: "📢",
    },
    {
      id: "join_community",
      title: "Join Pixel Warriors Community",
      description: "Join discussion group & coordinate canvas raids",
      url: "https://t.me/+uDsoROYbP7kyZTI1",
      rewardPixels: 20,
      icon: "💬",
    },
  ]);
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const [claimingId, setClaimingId] = useState(null);

  const completedSet = new Set(player?.completedTasks || []);

  const handleTaskAction = async (task) => {
    if (completedSet.has(task.id) || claimingId === task.id) return;

    if (!clickedTasks.has(task.id)) {
      // Step 1: Open Link
      haptic.impact("light");
      sound.playClick();
      openTelegramLink(task.url);
      setClickedTasks((prev) => new Set(prev).add(task.id));
      showToast("Return here after joining to claim +20 Pixels!", "info");
    } else {
      // Step 2: Claim Reward
      setClaimingId(task.id);
      haptic.impact("medium");

      try {
        const res = await api.completeTask(player.id, task.id);
        if (res?.success) {
          setPlayer((prev) => ({
            ...prev,
            pixelBalance: res.newBalance,
            completedTasks: res.completedTasks,
          }));
          sound.playClaimReward();
          haptic.notification("success");
          showToast(`🎁 Claimed +${task.rewardPixels} Free Pixels!`, "success");
        }
      } catch (err) {
        showToast(err.message || "Failed to claim task", "error");
        haptic.notification("error");
      } finally {
        setClaimingId(null);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header Banner */}
      <div className="arcade-box p-4 bg-[#14121d] border-2 border-black flex flex-col gap-2 shadow-pixel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#251b38] border-2 border-black text-[#a78bfa]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-pixel text-xs text-white uppercase">
              EARN TASKS CENTER
            </h3>
            <p className="font-arcade text-xs text-slate-300 mt-0.5">
              COMPLETE COMMUNITY TASKS TO CLAIM <strong>FREE PIXEL PACKS</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex flex-col gap-2.5">
        {tasks.map((task) => {
          const isDone = completedSet.has(task.id);
          const isReadyToClaim = clickedTasks.has(task.id) && !isDone;
          const isClaiming = claimingId === task.id;

          return (
            <div
              key={task.id}
              className={`arcade-box p-3 border-2 border-black flex items-center justify-between transition ${
                isDone
                  ? "bg-[#0f241a] border-[#047857]"
                  : isReadyToClaim
                  ? "bg-[#1f1912] border-[#f59e0b] shadow-pixel-sm"
                  : "bg-[#141520]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{task.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-pixel text-xs text-white uppercase">
                      {task.title}
                    </h4>
                  </div>
                  <p className="font-arcade text-xs text-slate-400 mt-0.5">
                    {task.description}
                  </p>
                  <span className="inline-block mt-1 font-pixel text-[8px] text-[#10b981] bg-[#0f241a] px-1.5 py-0.2 border border-[#047857]">
                    +{task.rewardPixels} FREE PIXELS
                  </span>
                </div>
              </div>

              <div>
                {isDone ? (
                  <span className="font-pixel text-[8px] bg-[#0f241a] text-[#34d399] px-2.5 py-1.5 border border-[#047857] flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                    DONE
                  </span>
                ) : (
                  <button
                    onClick={() => handleTaskAction(task)}
                    disabled={isClaiming}
                    className={`pixel-btn py-2 px-3 text-[9px] flex items-center gap-1 ${
                      isReadyToClaim
                        ? "pixel-btn-emerald animate-pulse"
                        : "pixel-btn-violet"
                    }`}
                  >
                    {isClaiming ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : isReadyToClaim ? (
                      <>
                        <Gift className="w-3.5 h-3.5" />
                        <span>CLAIM (+20)</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>JOIN</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}