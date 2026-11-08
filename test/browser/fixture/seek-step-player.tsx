import { createRoot } from "react-dom/client";
import {
  VibePlayerCompact,
  type VibePlayerSource,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./styles.css";

/**
 * `?skin=glass|chips|stage&step=15&skip&doubleTap` renders one 24 s file
 * player; compact skins are feed players 360 px wide.
 */
const query = new URLSearchParams(window.location.search);
const skin = query.get("skin") ?? "glass";
const step = query.has("step") ? Number(query.get("step")) : undefined;

const source: VibePlayerSource = {
  id: "seek-step-file",
  posterUrl: "/media/seek-frame.jpg",
  sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
  type: "file",
};

const shared = {
  controls: query.has("skip") ? { skip: true } : undefined,
  gestures: query.has("doubleTap") ? { doubleTapSeek: true } : undefined,
  seekStep: step,
  source,
  stopWhenOffscreen: false,
};

function Player() {
  if (skin === "stage") {
    return <VibePlayerStage {...shared} autoHideControls={false} />;
  }
  return (
    <div style={{ width: 360 }}>
      <VibePlayerCompact
        {...shared}
        skin={skin === "chips" ? "chips" : "glass"}
        variant="feed"
      />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing seek step fixture root.");
}
createRoot(root).render(
  <main>
    <Player />
  </main>
);
