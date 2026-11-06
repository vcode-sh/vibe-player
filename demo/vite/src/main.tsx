import { createRoot } from "react-dom/client";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./styles/app.css";
import "./styles/demo-panel.css";
import "./styles/source-rail.css";
import "./styles/player-shell.css";
import "./styles/player-state-strip.css";
import "./styles/adoption-demo.css";
import { AdoptionDemo } from "./adoption-demo";
import { App } from "./app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Vite demo root element is missing.");
}

const Demo =
  new URLSearchParams(window.location.search).get("demo") === "adoption"
    ? AdoptionDemo
    : App;
createRoot(rootElement).render(<Demo />);
