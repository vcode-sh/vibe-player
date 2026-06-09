import { createRoot } from "react-dom/client";
import "vibe-player/styles.css";
import "./styles/app.css";
import "./styles/demo-panel.css";
import "./styles/source-rail.css";
import "./styles/player-shell.css";
import "./styles/player-state-strip.css";
import { App } from "./app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Vite demo root element is missing.");
}

createRoot(rootElement).render(<App />);
