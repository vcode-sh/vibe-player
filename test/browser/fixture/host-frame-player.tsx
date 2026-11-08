import { type CSSProperties, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  VibePlayerCompact,
  type VibePlayerCompactSkin,
  VibePlayerHeatmap,
  type VibePlayerSource,
  type VibePlayerWatchedRangesReport,
} from "vibe-player";
import "vibe-player/styles.css";
import "vibe-player/chips.css";

const query = new URLSearchParams(window.location.search);
const skin: VibePlayerCompactSkin =
  query.get("skin") === "chips" ? "chips" : "glass";
const heatmap = [0.2, 0.4, 1, 0.6, 0.3, 0.5, 0.9, 0.2];
const frame: CSSProperties = { height: 180, width: 320 };

function createFixtureSource(): VibePlayerSource {
  const posterUrl = "/media/seek-frame.jpg";
  if (query.get("provider") === "hls") {
    return {
      id: "host-hls",
      posterUrl,
      type: "hls",
      url: "/media/master.m3u8",
    };
  }
  return {
    id: "host-file",
    posterUrl,
    sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
    type: "file",
  };
}

const source = createFixtureSource();

function App() {
  const [inline, setInline] = useState<HTMLElement | null>(null);
  const [floating, setFloating] = useState<HTMLElement | null>(null);
  const [docked, setDocked] = useState(true);
  const [report, setReport] = useState<VibePlayerWatchedRangesReport | null>(
    null
  );
  return (
    <main>
      <button onClick={() => setDocked((value) => !value)} type="button">
        {docked ? "Float player" : "Dock player"}
      </button>
      <section aria-label="Inline slot" ref={setInline} style={frame} />
      <aside aria-label="Floating host" ref={setFloating} style={frame} />
      <VibePlayerCompact
        controls={{ pictureInPicture: true }}
        host={docked ? inline : floating}
        load="onPlay"
        onWatchedRanges={setReport}
        skin={skin}
        source={source}
        stopWhenOffscreen={false}
        timelineBackground={() => <VibePlayerHeatmap values={heatmap} />}
      />
      <output aria-label="Watched ranges">
        {report ? JSON.stringify(report) : "none"}
      </output>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing host frame fixture root.");
}
createRoot(root).render(<App />);
