import React from "react";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { sound } from "../../services/sound.js";
import { Palette, CheckSquare, ShoppingBag, Trophy, Users } from "lucide-react";

export function Navigation({ activeTab, setActiveTab }) {
  const { haptic } = useTelegram();

  const tabs = [
    { id: "canvas", label: "Canvas", icon: Palette },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "store", label: "Shop", icon: ShoppingBag },
    { id: "airdrop", label: "Airdrop", icon: Trophy },
    { id: "referrals", label: "Guild", icon: Users },
  ];

  const handleTabClick = (id) => {
    setActiveTab(id);
    sound.playClick();
    haptic.impact("light");
  };

  return (
    <nav className="w-full bg-[#0e1017] border-t-2 border-[#282c3c] px-2 py-1 flex items-center justify-around z-20 shadow-pixel-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 border transition-all ${
              isActive
                ? "bg-[#1f2333] border-[#f59e0b] text-[#f59e0b] shadow-pixel-sm translate-y-[-2px]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-[#f59e0b]" : "text-slate-400"}`} />
            <span className="font-pixel text-[8px] tracking-wider uppercase">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}