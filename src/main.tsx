import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";
import "./overrides.css";

registerSW({
  immediate: false,
  onNeedRefresh() { window.dispatchEvent(new CustomEvent("ptd:update-available")); },
  onOfflineReady() { window.dispatchEvent(new CustomEvent("ptd:offline-ready")); }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
