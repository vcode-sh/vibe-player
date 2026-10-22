import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VibePlayerStage, type VibePlayerYouTubeSource } from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const source: VibePlayerYouTubeSource = {
  controls: params.get("controls") === "native" ? "native" : "custom",
  id: "live-youtube-stage",
  origin: window.location.origin,
  title: "Live YouTube stage acceptance",
  type: "youtube",
  youtubeVideoId: params.get("video") ?? "M7lc1UVf-VE",
  ...(params.has("captions")
    ? { captionLanguage: "en", showCaptionsByDefault: true }
    : {}),
};
window.youtubeStageAcceptance = { events: [], state: null };

function StageFixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <main>
      <h1>Live YouTube stage acceptance</h1>
      <div style={{ width: Number(params.get("width") ?? "960") }}>
        {mounted ? (
          <VibePlayerStage
            autoHideControls={false}
            onClose={() => setMounted(false)}
            onStateChange={(state) => {
              const probe = window.youtubeStageAcceptance;
              probe.state = state;
              probe.events = [
                ...probe.events,
                state.lastEvent ?? "state",
              ].slice(-100);
            }}
            source={source}
          />
        ) : null}
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing live stage fixture root.");
}
createRoot(root).render(<StageFixture />);
