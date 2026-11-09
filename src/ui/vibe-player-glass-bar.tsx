import {
  VibePlayerGlassEndButtons,
  VibePlayerGlassSkip,
} from "./vibe-player-glass-bar-buttons";
import { VibePlayerScrubber } from "./vibe-player-scrubber";
import {
  playbackSwapItems,
  revealProps,
  VibePlayerSwap,
} from "./vibe-player-surface-parts";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import type { VibePlayerSurface } from "./vibe-player-surface-types";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

/** The capsule: optional skips around play, a short scrubber, time and mute. */
export function VibePlayerGlassBar({
  surface,
}: {
  surface: VibePlayerSurface;
}) {
  const { classNames, formatTime, labels } = useVibePlayerUI();
  const { actions, controls, state } = surface;
  // Loading carries a play request; the toggle offers to cancel it.
  const playing =
    isVibePlayerSurfacePlaying(state.phase) || state.phase === "loading";
  const button = vibePlayerClassName(
    "vibe-player-glass__button",
    classNames.button
  );
  const time = formatTime(state.time);
  return (
    <div
      {...revealProps(
        state.controlsVisible,
        "vibe-player-glass__bar vibe-player-glass__glass",
        "controls",
        classNames.controls
      )}
    >
      <VibePlayerGlassSkip button={button} side={-1} surface={surface} />
      <button
        aria-label={playing ? labels.pause : labels.play}
        className={button}
        data-part="toggle"
        onClick={playing ? actions.pause : actions.play}
        type="button"
      >
        <VibePlayerSwap
          items={playbackSwapItems({ busy: false, ended: false, playing })}
        />
      </button>
      <VibePlayerGlassSkip button={button} side={1} surface={surface} />
      <VibePlayerGlassTrack surface={surface} time={time} />
      {controls.time ? <VibePlayerGlassTime time={time} /> : null}
      <VibePlayerGlassEndButtons button={button} surface={surface} />
    </div>
  );
}

function VibePlayerGlassTime({ time }: { time: string }) {
  const { classNames } = useVibePlayerUI();
  return (
    <span
      className={vibePlayerClassName(
        "vibe-player-glass__time",
        classNames.time
      )}
      data-part="time"
    >
      {time}
    </span>
  );
}

/** The short scrubber with its time bubble, or a spacer without seeking. */
function VibePlayerGlassTrack({
  surface,
  time,
}: {
  surface: VibePlayerSurface;
  time: string;
}) {
  if (!surface.controls.seek) {
    return <span className="vibe-player-glass__spacer" />;
  }
  return (
    <VibePlayerScrubber
      bubble={
        <span
          className="vibe-player-glass__bubble vibe-player-glass__tint"
          data-part="scrub-bubble"
          data-visible={surface.state.scrubbing}
        >
          {time}
        </span>
      }
      className="vibe-player-glass__track"
      surface={surface}
    />
  );
}
