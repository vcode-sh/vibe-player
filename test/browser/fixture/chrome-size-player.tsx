import { createRoot } from "react-dom/client";
import { VibePlayerCompact, type VibePlayerSource } from "vibe-player";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./styles.css";
import "./chrome-size.css";

/**
 * `?skin=glass|chips&size=default|small|tiny` renders one paused-able 24 s
 * file player: `default` is 360 px with no sizing variables, `small` is
 * 200 px with chrome scaled by container units, `tiny` is 200 px with
 * variables below the 24 px hit-area floor.
 */
const query = new URLSearchParams(window.location.search);
const skin = query.get("skin") === "chips" ? "chips" : "glass";
const size = query.get("size") ?? "default";

const source: VibePlayerSource = {
  id: "chrome-size-file",
  posterUrl: "/media/seek-frame.jpg",
  sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
  type: "file",
};

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing chrome size fixture root.");
}
createRoot(root).render(
  <main>
    <div className={`chrome-size chrome-size--${size}`}>
      <VibePlayerCompact
        controls={{ skip: true }}
        skin={skin}
        source={source}
        stopWhenOffscreen={false}
        variant="feed"
      />
    </div>
  </main>
);
