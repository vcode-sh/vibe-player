import { type CSSProperties, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  VibePlayerCompact,
  type VibePlayerCompactSkin,
  type VibePlayerController,
  type VibePlayerControllerState,
  type VibePlayerSource,
} from "vibe-player/compact";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./skins-styles.css";
import { tablerIcons } from "./skins-icons";

const mediaOrigin = "http://127.0.0.1:5222";
const query = new URLSearchParams(window.location.search);
const skin: VibePlayerCompactSkin =
  query.get("skin") === "chips" ? "chips" : "glass";
const name = query.get("name") ?? "portrait";
const width = Number(query.get("width") ?? 236);
const scenario = query.get("scenario") ?? "normal";
const renewDelay = Number(query.get("renewDelay") ?? 0);
const loadHls = () => import("hls.js/light");
document.documentElement.dataset.theme = query.get("theme") ?? "light";

function issue(lifetime: number): VibePlayerSource {
  const portrait = name === "portrait";
  return {
    durationSeconds: name === "long" ? 60 : 8,
    height: portrait ? 1280 : 720,
    id: `skins-${name}`,
    posterUrl: `${mediaOrigin}/poster/${portrait ? "portrait" : "landscape"}.jpg`,
    title: `${name} clip`,
    type: "hls",
    url: `${mediaOrigin}/v/${Date.now() + lifetime}/${name}/master.m3u8`,
    width: portrait ? 720 : 1280,
  };
}

function initialLifetime() {
  if (scenario === "error") {
    return -1;
  }
  if (scenario === "expiry") {
    return Number(query.get("lifetime") ?? 3000);
  }
  return 600_000;
}

function App() {
  const source = useMemo(() => issue(initialLifetime()), []);
  const controllerRef = useRef<VibePlayerController>(null);
  const [state, setState] = useState<VibePlayerControllerState | null>(null);
  const [renewals, setRenewals] = useState(0);
  async function renewSource() {
    setRenewals((count) => count + 1);
    await new Promise((settle) => setTimeout(settle, renewDelay));
    if (scenario === "error") {
      throw new Error("The fixture API is unavailable.");
    }
    return issue(600_000);
  }
  return (
    <main>
      <label>
        Message composer
        <input aria-label="Message composer" defaultValue="Draft" />
      </label>
      <section
        aria-label="Skin fixture"
        className="skins-frame"
        style={{ width } as CSSProperties}
      >
        <VibePlayerCompact
          autoPlay={query.has("autoplay")}
          controllerRef={controllerRef}
          fit={query.get("variant") === "feed" ? "cover" : undefined}
          icons={tablerIcons}
          labels={{
            retry: "Try again",
            unavailable: "This video is unavailable",
          }}
          load="onPlay"
          loadHls={loadHls}
          maxRatio={16 / 9}
          minRatio={query.get("variant") === "feed" ? 0.8 : 9 / 16}
          onStateChange={setState}
          renewSource={renewSource}
          skin={skin}
          source={source}
          stopWhenOffscreen={false}
          variant={query.get("variant") === "feed" ? "feed" : "compact"}
        />
      </section>
      <div className="skins-proof">
        <output aria-label="Player state">
          {state?.snapshot.readyState ?? "idle"}
        </output>
        <output aria-label="Renewing">
          {String(state?.renewing ?? false)}
        </output>
        <output aria-label="Renewals">{renewals}</output>
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing skins fixture root.");
}
createRoot(root).render(<App />);
