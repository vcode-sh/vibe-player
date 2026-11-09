import { createRoot } from "react-dom/client";
import {
  VibePlayerCompact,
  type VibePlayerFileSource,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";

// Longer than the 1 s pointer-focus window, so a later focus counts as
// navigation rather than the tail of the click that started playback.
const controlsHideDelay = 1500;

function fileSource(id: string, title: string, url: string) {
  const source: VibePlayerFileSource = {
    id,
    sources: [{ mimeType: "video/mp4", url }],
    title,
    type: "file",
  };
  return source;
}

function LivePlayers() {
  return (
    <main>
      <h1>Live region and reveal acceptance</h1>
      <button type="button">Before players</button>
      <div style={{ maxWidth: 640 }}>
        <VibePlayerStage
          controlsHideDelay={controlsHideDelay}
          source={fileSource("live-stage", "Stage sample", "/media/file.mp4")}
        />
      </div>
      <div style={{ maxWidth: 360 }}>
        <VibePlayerCompact
          controlsHideDelay={controlsHideDelay}
          source={fileSource(
            "live-compact",
            "Compact sample",
            "/media/file.mp4"
          )}
        />
      </div>
      <div style={{ maxWidth: 360 }}>
        <VibePlayerCompact
          source={fileSource(
            "live-broken",
            "Broken sample",
            "/failures/missing.mp4"
          )}
        />
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing live region fixture root.");
}
createRoot(root).render(<LivePlayers />);
