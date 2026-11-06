import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type HlsAdapterRuntime,
  type VibePlayerControllerState,
  type VibePlayerEvent,
  VibePlayerModal,
  type VibePlayerSource,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import "./host-styles.css";
import { ManyPlayers } from "./host-many-players";
import { useOriginalMediaTime } from "./host-original-media-time";

const mediaOrigin = "http://127.0.0.1:5222";
const parameters = new URLSearchParams(window.location.search);
const scenario = parameters.get("scenario") ?? "lazy";
const loadHls = () => import("hls.js/light");
const nativeHlsRuntime: HlsAdapterRuntime = {
  attachManagedHls: () => {
    throw new Error(
      "This acceptance case requires the real native HLS backend."
    );
  },
  canUseManagedHls: () => false,
};

function issueSource(
  name: string,
  lifetime = 600_000,
  posterLifetime: number | null = null
): VibePlayerSource {
  const portrait = name === "portrait";
  const poster =
    posterLifetime === null
      ? `${mediaOrigin}/poster/${portrait ? "portrait" : "landscape"}.jpg`
      : `${mediaOrigin}/v/${Date.now() + posterLifetime}/${name}/poster.jpg`;
  return {
    durationSeconds: name === "long" ? 60 : 8,
    height: portrait ? 1280 : 720,
    id: `acceptance-${name}`,
    posterUrl: poster,
    title: `${name} clip`,
    type: "hls",
    url: `${mediaOrigin}/v/${Date.now() + lifetime}/${name}/master.m3u8`,
    width: portrait ? 720 : 1280,
  };
}

function Player({ name, width = 400 }: { name: string; width?: number }) {
  const { frame, originalTime, renewedStart } = useOriginalMediaTime();
  const [state, setState] = useState<VibePlayerControllerState | null>(null);
  const [renewals, setRenewals] = useState(0);
  const [errors, setErrors] = useState(0);
  const [open, setOpen] = useState(true);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const source = useMemo(() => {
    if (scenario === "error") {
      return issueSource(name, -1);
    }
    if (scenario === "expiry") {
      return issueSource(name, 6000);
    }
    if (scenario === "poster") {
      return issueSource(name, 600_000, -1);
    }
    return issueSource(name);
  }, [name]);
  const requestedVariant = parameters.get("variant");
  let variant: "compact" | "feed" | "full" = "compact";
  if (requestedVariant === "full" || requestedVariant === "feed") {
    variant = requestedVariant;
  }
  async function renewSource() {
    setRenewals((count) => count + 1);
    if (scenario === "error" && renewals === 0) {
      throw new Error("The fixture API is temporarily unavailable.");
    }
    return issueSource(name, 600_000, scenario === "poster" ? 600_000 : null);
  }
  const playback = {
    ...(parameters.get("fit") === "cover" ? { fit: "cover" as const } : {}),
    ...(parameters.has("minRatio")
      ? { minRatio: Number(parameters.get("minRatio")) }
      : {}),
    load: "onPlay" as const,
    loadHls,
    ...(parameters.has("native") ? { hlsRuntime: nativeHlsRuntime } : {}),
    onError: () => setErrors((count) => count + 1),
    onEvent: (event: VibePlayerEvent) => {
      if (event.type === "error") {
        setDiagnostics((previous) => [...previous, JSON.stringify(event)]);
      }
    },
    onStateChange: setState,
    renewSource,
    source,
    stopWhenOffscreen: scenario === "offscreen",
  };
  return (
    <section
      aria-label={`${name} player`}
      className="host-fixture"
      style={{ width }}
    >
      <div className="host-frame" ref={frame}>
        {scenario === "modal" ? (
          <VibePlayerModal
            {...playback}
            onClose={() => setOpen(false)}
            open={open}
          />
        ) : (
          <VibePlayerStage {...playback} variant={variant} />
        )}
      </div>
      <div className="host-proof">
        <output aria-label="Player state">
          {state?.snapshot.readyState ?? "idle"}
        </output>
        <output aria-label="Playback time">
          {state?.snapshot.currentTime.toFixed(2) ?? "0"}
        </output>
        <output aria-label="Renewals">{renewals}</output>
        <output aria-label="Errors">{errors}</output>
        <output aria-label="Original media time">
          {originalTime.toFixed(2)}
        </output>
        <output aria-label="Renewed media start">
          {renewedStart?.toFixed(2) ?? "pending"}
        </output>
        <output data-engine-diagnostics hidden>
          {JSON.stringify(diagnostics)}
        </output>
      </div>
    </section>
  );
}

function App() {
  if (scenario === "many") {
    return (
      <main>
        <ManyPlayers count={Number(parameters.get("count") ?? 100)} />
      </main>
    );
  }
  return (
    <main>
      <h1>Inline video acceptance</h1>
      <label>
        Message composer
        <input
          aria-label="Message composer"
          defaultValue="An unfinished message"
        />
      </label>
      {scenario === "lazy" ? (
        <div className="host-players">
          <Player name="portrait" width={236} />
          <Player name="landscape" />
          <Player name="portrait" width={320} />
        </div>
      ) : (
        <Player
          name={
            scenario === "expiry"
              ? "long"
              : (parameters.get("name") ?? "portrait")
          }
          width={Number(parameters.get("width") ?? 236)}
        />
      )}
      {scenario === "offscreen" ? (
        <div aria-label="Later messages" className="host-spacer" role="note" />
      ) : null}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing host acceptance fixture root.");
}
window.hostMountStart = performance.now();
createRoot(root).render(<App />);
