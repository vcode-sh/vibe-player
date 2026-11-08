import { useState } from "react";
import {
  createVibePlayerSeekThumbnails,
  VibePlayerCompact,
  VibePlayerHeatmap,
} from "vibe-player";
import { landscapeSource, loadLightHls } from "../adoption-sources";

/**
 * Illustrative share of viewers for 100 equal slices, with a high opening
 * and a rewatched moment near 40 %; a real host aggregates `onWatchedRanges`.
 */
const replayIntensity = Array.from({ length: 100 }, (_, index) => {
  const x = index / 99;
  const bump = (centre: number, width: number, height: number) =>
    height * Math.exp(-((x - centre) ** 2) / (2 * width * width));
  return (
    0.18 +
    0.4 * Math.exp(-x * 3) +
    bump(0.4, 0.04, 0.62) +
    bump(0.75, 0.06, 0.3)
  );
});

/** The generated storyboard: one 160 x 90 tile per second, four per row. */
const seekThumbnails = createVibePlayerSeekThumbnails({
  columns: 4,
  count: 8,
  height: 90,
  interval: 1,
  url: "/adoption-media/landscape/storyboard.jpg",
  width: 160,
});

const labels = {
  replayValue: (share: number) => `${Math.round(share * 100)}% of viewers`,
};

interface AdoptionFeedPlayerProps {
  onOpenViewer: () => void;
}

/**
 * A feed card whose player can float into a corner mini-player and dock
 * back without restarting. Hovering or scrubbing its timeline draws a "most
 * replayed" line with the frame and share of viewers above it.
 */
export function AdoptionFeedPlayer({ onOpenViewer }: AdoptionFeedPlayerProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [mini, setMini] = useState<HTMLElement | null>(null);
  const [floating, setFloating] = useState(false);
  return (
    <>
      <div className="vp-adoption-feed__slot" ref={setSlot} />
      {floating ? (
        <aside
          aria-label="Mini-player"
          className="vp-adoption-mini"
          ref={setMini}
        />
      ) : null}
      <VibePlayerCompact
        audioFocus="adoption-demo"
        controls={{ pictureInPicture: true }}
        host={floating ? mini : slot}
        labels={labels}
        loadHls={loadLightHls}
        seekThumbnails={seekThumbnails}
        skin="chips"
        source={landscapeSource}
        stopWhenOffscreen={false}
        timelineBackground={() => (
          <VibePlayerHeatmap values={replayIntensity} />
        )}
        variant="feed"
      />
      <footer>
        <p>A clear view, at every size.</p>
        <span className="vp-adoption-feed__actions">
          <button
            className="vp-adoption-action"
            onClick={() => setFloating((value) => !value)}
            type="button"
          >
            {floating ? "Dock player" : "Float player"}
          </button>
          <button
            className="vp-adoption-action"
            onClick={onOpenViewer}
            type="button"
          >
            Open viewer
          </button>
        </span>
      </footer>
    </>
  );
}
