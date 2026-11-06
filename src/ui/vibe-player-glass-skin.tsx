import { VibePlayerGlassBar } from "./vibe-player-glass-bar";
import { MuteIcon, RetryIcon, UnavailableIcon } from "./vibe-player-icons";
import {
  getVibePlayerPrimaryLabel,
  renderVibePlayerSlot,
  type VibePlayerSkinProps,
} from "./vibe-player-skin-props";
import {
  playbackSwapItems,
  revealProps,
  VibePlayerSpinner,
  VibePlayerSwap,
} from "./vibe-player-surface-parts";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

const glass = "vibe-player-glass__glass";

/**
 * Glass Capsule: frosted parts inset 8 px. One centre button carries idle,
 * loading, paused and ended; the capsule exists only while steering.
 */
export function VibePlayerGlassSkin(props: VibePlayerSkinProps) {
  const { classNames, formatTime, labels } = useVibePlayerUI();
  const { actions, state } = props.surface;
  const { busy, phase } = state;
  const playing = isVibePlayerSurfacePlaying(phase);
  const ended = phase === "ended";
  const idle = renderVibePlayerSlot(props, "idle");
  const end = renderVibePlayerSlot(props, "ended");
  const error = renderVibePlayerSlot(props, "error");
  const custom = idle.custom || end.custom;
  const hidden = playing && !state.controlsVisible;
  const primaryLabel = getVibePlayerPrimaryLabel(phase, labels);
  return (
    <div className="vibe-player-surface vibe-player-glass" data-part="overlay">
      <button
        {...revealProps(
          !(custom || playing || phase === "error"),
          `vibe-player-glass__primary ${glass}`,
          "play-button",
          vibePlayerClassName(classNames.playButton, classNames.button)
        )}
        aria-label={primaryLabel}
        onClick={actions.primary}
        type="button"
      >
        <VibePlayerSwap items={playbackSwapItems({ busy, ended, playing })} />
      </button>
      <span
        {...revealProps(
          !custom && (phase === "idle" || ended) && state.duration > 0,
          "vibe-player-glass__duration vibe-player-glass__tint",
          "duration",
          classNames.duration
        )}
      >
        {formatTime(state.duration)}
      </span>
      <VibePlayerGlassBar surface={props.surface} />
      <button
        {...revealProps(
          hidden && state.autoplayMuted,
          "vibe-player-glass__unmute",
          "unmute",
          classNames.unmute
        )}
        aria-label={labels.unmute}
        onClick={() => actions.setMuted(false)}
        type="button"
      >
        <span className={`vibe-player-glass__face ${glass}`}>
          <MuteIcon />
        </span>
      </button>
      <span
        {...revealProps(
          hidden && busy,
          `vibe-player-glass__renewing ${glass}`,
          "renewing"
        )}
        aria-hidden
      >
        <VibePlayerSpinner />
      </span>
      <div
        {...revealProps(
          phase === "error" && !error.custom,
          "vibe-player-glass__error",
          "error",
          classNames.error
        )}
      >
        <span className={`vibe-player-glass__error-icon ${glass}`}>
          <UnavailableIcon />
        </span>
        <p>{labels.unavailable}</p>
        <button
          className={vibePlayerClassName(
            `vibe-player-glass__retry ${glass}`,
            classNames.retry
          )}
          data-part="retry"
          onClick={actions.retry}
          type="button"
        >
          <RetryIcon />
          {labels.retry}
        </button>
      </div>
      {idle.node}
      {end.node}
      {error.node}
    </div>
  );
}
