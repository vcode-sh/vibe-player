import { useState } from "react";
import { VibePlayerCompact, VibePlayerHeatmap } from "vibe-player";
import { landscapeSource, loadLightHls } from "../adoption-sources";

/** Illustrative replay intensity; a real host aggregates `onWatchedRanges`. */
const replayIntensity = [
  0.18, 0.22, 0.3, 0.62, 1, 0.74, 0.4, 0.28, 0.35, 0.58, 0.46, 0.24,
];

interface AdoptionFeedPlayerProps {
  onOpenViewer: () => void;
}

/**
 * A feed card whose player can float into a corner mini-player and dock
 * back without restarting, with a "most replayed" graph under the scrubber.
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
        loadHls={loadLightHls}
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
