import { type CSSProperties, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type VibePlayerAnalyticsEvent,
  VibePlayerCompact,
  type VibePlayerCompactSkin,
  VibePlayerHeatmap,
  type VibePlayerResumeStore,
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

interface ResumeSave {
  reason: string;
  seconds: number;
}

const resumeSaves: ResumeSave[] = [];
let showResumeSaves: (saves: ResumeSave[]) => void = () => undefined;
const recordResume = (save: ResumeSave) => {
  resumeSaves.push(save);
  showResumeSaves([...resumeSaves]);
};
/** Records what the store hears; it stores nothing, so nothing resumes. */
const resumeStore: VibePlayerResumeStore = {
  clear: () => recordResume({ reason: "clear", seconds: 0 }),
  get: () => null,
  set: (_sourceId, seconds, context) =>
    recordResume({ reason: context?.reason ?? "none", seconds }),
};

function App() {
  const [inline, setInline] = useState<HTMLElement | null>(null);
  const [floating, setFloating] = useState<HTMLElement | null>(null);
  const [docked, setDocked] = useState(true);
  const [report, setReport] = useState<VibePlayerWatchedRangesReport | null>(
    null
  );
  const [seeks, setSeeks] = useState<VibePlayerAnalyticsEvent[]>([]);
  const [analytics, setAnalytics] = useState<string[]>([]);
  const [saves, setSaves] = useState<ResumeSave[]>([]);
  useEffect(() => {
    showResumeSaves = setSaves;
  }, []);
  const recordAnalytics = (event: VibePlayerAnalyticsEvent) => {
    setAnalytics((list) => [...list, event.type]);
    if (event.type === "seek") {
      setSeeks((list) => [...list, event]);
    }
  };
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
        onAnalyticsEvent={recordAnalytics}
        onWatchedRanges={setReport}
        resumeStore={resumeStore}
        skin={skin}
        source={source}
        stopWhenOffscreen={false}
        timelineBackground={() => <VibePlayerHeatmap values={heatmap} />}
      />
      <output aria-label="Watched ranges">
        {report ? JSON.stringify(report) : "none"}
      </output>
      <output aria-label="Seek analytics">{JSON.stringify(seeks)}</output>
      <output aria-label="Analytics">{JSON.stringify(analytics)}</output>
      <output aria-label="Resume saves">{JSON.stringify(saves)}</output>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing host frame fixture root.");
}
createRoot(root).render(<App />);
