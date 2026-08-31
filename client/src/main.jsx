import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import { TelegramProvider } from "./context/TelegramContext.jsx";
import { GameProvider } from "./context/GameContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TelegramProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </TelegramProvider>
  </React.StrictMode>
);
