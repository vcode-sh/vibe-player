import { createRoot } from "react-dom/client";
import { createYouTubeAdapter, VibePlayerModal } from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";
import { createLayoutRuntime } from "./youtube-layout-runtime";

const runtime = createLayoutRuntime();
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing YouTube modal fixture root.");
}
createRoot(root).render(
  <VibePlayerModal
    adapterFactory={() => createYouTubeAdapter(runtime)}
    onClose={() => undefined}
    open
    source={{
      id: "modal-custom",
      title: "Modal YouTube layout fixture",
      type: "youtube",
      youtubeVideoId: "layout-fixture",
    }}
  />
);
