import { createRoot } from "react-dom/client";
import {
  createVibePlayerSeekThumbnails,
  VibePlayerCompact,
  VibePlayerHeatmap,
  type VibePlayerSource,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import "vibe-player/chips.css";
import "./styles.css";

const query = new URLSearchParams(window.location.search);
const skin = query.get("skin") ?? "glass";
const variant = query.get("variant") === "curve" ? "curve" : "glide";

/** 100 slices: a high opening, one clear peak at 50 % and a low tail. */
const values = Array.from({ length: 100 }, (_, index) => {
  const x = index / 99;
  return Math.min(
    1,
    0.2 + 0.4 * Math.exp(-x * 12) + 0.8 * Math.exp(-((x - 0.5) ** 2) / 0.002)
  );
});

// The 320 x 180 fixture sheet holds four 160 x 90 tiles, six seconds each.
const seekThumbnails = createVibePlayerSeekThumbnails({
  columns: 2,
  count: 4,
  height: 90,
  interval: 6,
  url: "/media/seek-sprite.jpg",
  width: 160,
});

const source: VibePlayerSource = {
  id: "heatmap-file",
  posterUrl: "/media/seek-frame.jpg",
  sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
  type: "file",
};

const shared = {
  labels: {
    replayValue: (value: number) => `${Math.round(value * 100)}% of viewers`,
  },
  seekThumbnails: query.has("thumbnails") ? seekThumbnails : undefined,
  source,
  // `heatmap=off` leaves the seek thumbnails as the only scrub preview.
  timelineBackground:
    query.get("heatmap") === "off"
      ? undefined
      : () => <VibePlayerHeatmap values={values} variant={variant} />,
};

function Player() {
  if (skin === "stage") {
    return <VibePlayerStage {...shared} autoHideControls={false} />;
  }
  return (
    <div style={{ width: Number(query.get("width") ?? 480) }}>
      <VibePlayerCompact
        {...shared}
        skin={skin === "chips" ? "chips" : "glass"}
        stopWhenOffscreen={false}
        variant="feed"
      />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing heatmap fixture root.");
}
createRoot(root).render(
  <main>
    <Player />
  </main>
);
