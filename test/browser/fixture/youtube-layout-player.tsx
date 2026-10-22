import { createRoot } from "react-dom/client";
import { createYouTubeAdapter, VibePlayerStage } from "vibe-player";
import "vibe-player/styles.css";
import { seekThumbnails } from "./seek-thumbnails";
import "./styles.css";
import { createLayoutRuntime } from "./youtube-layout-runtime";

const params = new URLSearchParams(window.location.search);
const controls = params.get("controls") === "native" ? "native" : "custom";
const width = Number(params.get("width") ?? "960");
const runtime = createLayoutRuntime();
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing YouTube layout fixture root.");
}
createRoot(root).render(
  <main>
    <h1>YouTube controls layout</h1>
    <div className="youtube-layout-container" style={{ width }}>
      <VibePlayerStage
        adapterFactory={() => createYouTubeAdapter(runtime)}
        onClose={() => undefined}
        {...(params.has("thumbnails") ? { seekThumbnails } : {})}
        source={{
          captionLanguage: "en",
          controls,
          id: `layout-${controls}`,
          title:
            "Embedded YouTube layout fixture with a long descriptive title",
          type: "youtube",
          youtubeVideoId: "layout-fixture",
        }}
        topActions={<button type="button">Host action</button>}
      />
    </div>
  </main>
);
