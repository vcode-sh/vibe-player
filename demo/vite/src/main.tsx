import { createRoot } from "react-dom/client";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./styles/app.css";
import "./styles/demo-panel.css";
import "./styles/source-rail.css";
import "./styles/player-shell.css";
import "./styles/player-state-strip.css";
import "./styles/showcase.css";
import "./styles/showcase-bar.css";
import "./styles/showcase-parts.css";
import "./styles/showcase-examples.css";
import { App } from "./app";
import { ShowcaseApp } from "./showcase/showcase-app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Vite demo root element is missing.");
}

// `?demo=workbench` is the provider workbench; everything else (including
// the former `?demo=adoption`) opens the feature showcase.
const page =
  new URLSearchParams(window.location.search).get("demo") === "workbench"
    ? "workbench"
    : "showcase";
document.documentElement.dataset.page = page;
createRoot(rootElement).render(
  page === "workbench" ? <App /> : <ShowcaseApp />
);
