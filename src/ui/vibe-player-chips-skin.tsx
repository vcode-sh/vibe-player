import { chip, VibePlayerChipsSide } from "./vibe-player-chips-side";
import { UnavailableIcon } from "./vibe-player-icons";
import { VibePlayerScrubber } from "./vibe-player-scrubber";
import {
  getVibePlayerPrimaryLabel,
  renderVibePlayerSlot,
  type VibePlayerSkinProps,
} from "./vibe-player-skin-props";
import {
  playbackSwapItems,
  revealProps,
  VibePlayerSwap,
} from "./vibe-player-surface-parts";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import type { VibePlayerSurfaceState } from "./vibe-player-surface-types";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
import type { VibePlayerLabels } from "./vibe-player-ui-types";

function chipText(
  state: VibePlayerSurfaceState,
  format: (seconds: number) => string,
  labels: VibePlayerLabels
) {
  if (state.phase === "idle" || state.phase === "loading") {
    return format(state.duration);
  }
  if (state.phase === "ended") {
    return labels.replay;
  }
  return format(Math.ceil(Math.max(0, state.duration - state.time) - 1e-6));
}

/**
 * Ink Chips: theme-following labels in the corners, a countdown while
 * playing, and a horizontal drag anywhere on the picture to scrub.
 */
export default function VibePlayerChipsSkin(props: VibePlayerSkinProps) {
  const { classNames, formatTime, labels } = useVibePlayerUI();
  const { actions, controls, state } = props.surface;
  const { busy, controlsVisible, phase } = state;
  const playing = isVibePlayerSurfacePlaying(phase);
  const ended = phase === "ended";
  const idle = renderVibePlayerSlot(props, "idle");
  const end = renderVibePlayerSlot(props, "ended");
  const error = renderVibePlayerSlot(props, "error");
  const custom = idle.custom || end.custom;
  const primaryLabel = getVibePlayerPrimaryLabel(phase, labels);
  const primaryVisible =
    !custom &&
    (phase === "idle" ||
      phase === "loading" ||
      ended ||
      controlsVisible ||
      (playing && busy));
  return (
    <div className="vibe-player-surface vibe-player-chips" data-part="overlay">
      <div
        aria-hidden={controlsVisible ? undefined : true}
        className="vibe-player-chips__rail"
        data-focusable={controlsVisible && controls.seek}
        data-visible={state.scrubbing}
        inert={controlsVisible && controls.seek ? undefined : true}
      >
        <VibePlayerScrubber interactive={false} surface={props.surface} />
      </div>
      <span
        {...revealProps(
          state.scrubbing,
          `vibe-player-chips__bubble ${chip}`,
          "scrub-bubble"
        )}
      >
        {`${formatTime(state.time)} / ${formatTime(state.duration)}`}
      </span>
      <div className="vibe-player-chips__dock" data-part="controls">
        <button
          {...revealProps(
            primaryVisible,
            "vibe-player-chips__primary",
            "play-button",
            vibePlayerClassName(classNames.playButton, classNames.button)
          )}
          aria-label={primaryLabel}
          onClick={actions.primary}
          type="button"
        >
          <span className={`vibe-player-chips__face ${chip}`}>
            <VibePlayerSwap
              items={playbackSwapItems({ busy, ended, playing })}
            />
            <span
              className={vibePlayerClassName(
                "vibe-player-chips__label",
                classNames.time
              )}
              data-part="time"
            >
              {chipText(state, formatTime, labels)}
            </span>
          </span>
        </button>
        <VibePlayerChipsSide surface={props.surface} />
      </div>
      <div
        {...revealProps(
          phase === "error" && !error.custom,
          `vibe-player-chips__error ${chip}`,
          "error",
          classNames.error
        )}
      >
        <UnavailableIcon />
        <p>{labels.unavailable}</p>
        <button
          className={vibePlayerClassName(
            "vibe-player-chips__retry",
            classNames.retry
          )}
          data-part="retry"
          onClick={actions.retry}
          type="button"
        >
          {labels.retry}
        </button>
      </div>
      {idle.node}
      {end.node}
      {error.node}
    </div>
  );
}
