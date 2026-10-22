import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type VibePlayerControllerState,
  VibePlayerInline,
  VibePlayerModal,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import { HeadlessPlayer } from "./headless-player";
import { seekThumbnails } from "./seek-thumbnails";
import { createSource } from "./sources";
import "./styles.css";

type Mode = "stage" | "inline" | "modal" | "headless";

function App() {
  const parameters = new URLSearchParams(window.location.search);
  const credentialed = parameters.has("credentials");
  const [provider, setProvider] = useState<"file" | "hls">(
    credentialed ? "hls" : "file"
  );
  const [mode, setMode] = useState<Mode>("stage");
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [openedEvents, setOpenedEvents] = useState(0);
  const [state, setState] = useState<VibePlayerControllerState | null>(null);
  const width = parameters.get("width");
  const source = createSource(provider, credentialed);
  const playback = {
    autoHideControls: false,
    onAnalyticsEvent: (event: { type: string }) => {
      if (event.type === "opened") {
        setOpenedEvents((count) => count + 1);
      }
    },
    onStateChange: (next: VibePlayerControllerState) => setState(next),
    seekThumbnails: parameters.has("thumbnails") ? seekThumbnails : undefined,
    source,
    topActions: (
      <button onClick={() => setRevision((value) => value + 1)} type="button">
        Rerender player host
      </button>
    ),
  };
  function selectMode(next: Mode) {
    setMode(next);
    setOpen(next === "modal");
  }
  return (
    <main>
      <h1>Package browser acceptance</h1>
      <nav aria-label="Fixture actions">
        <button onClick={() => setProvider("file")} type="button">
          File source
        </button>
        <button onClick={() => setProvider("hls")} type="button">
          HLS source
        </button>
        <button onClick={() => selectMode("stage")} type="button">
          Stage layout
        </button>
        <button onClick={() => selectMode("inline")} type="button">
          Inline layout
        </button>
        <button onClick={() => selectMode("modal")} type="button">
          Open modal
        </button>
        <button onClick={() => selectMode("headless")} type="button">
          Headless layout
        </button>
        <button onClick={() => setRevision((value) => value + 1)} type="button">
          Rerender host
        </button>
      </nav>
      <div className="proof">
        <output aria-label="Host revision">{revision}</output>
        <output aria-label="Opened events">{openedEvents}</output>
        <output aria-label="Player status">
          {state?.snapshot.readyState ?? "idle"}
        </output>
        <output aria-label="Current time">
          {state?.snapshot.currentTime.toFixed(2) ?? "0"}
        </output>
      </div>
      <section
        aria-label="Playback fixture"
        className="playback-fixture"
        style={width ? { width: `${Number(width)}px` } : undefined}
      >
        {mode === "stage" ? <VibePlayerStage {...playback} /> : null}
        {mode === "inline" ? <VibePlayerInline {...playback} /> : null}
        {mode === "headless" ? <HeadlessPlayer source={source} /> : null}
      </section>
      {mode === "modal" ? (
        <VibePlayerModal
          {...playback}
          onClose={() => setOpen(false)}
          open={open}
        />
      ) : null}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing browser fixture root.");
}
createRoot(root).render(<App />);
