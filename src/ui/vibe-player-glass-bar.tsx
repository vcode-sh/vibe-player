import {
  EnterFullscreenIcon,
  MuteIcon,
  PictureInPictureIcon,
  VolumeIcon,
} from "./vibe-player-icons";
import { VibePlayerScrubber } from "./vibe-player-scrubber";
import {
  playbackSwapItems,
  revealProps,
  VibePlayerSwap,
} from "./vibe-player-surface-parts";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import type { VibePlayerSurface } from "./vibe-player-surface-types";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

/** The capsule: play, a short inset scrubber, time and mute. */
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
      {controls.seek ? (
        <VibePlayerScrubber
          bubble={
            <span
              className="vibe-player-glass__bubble vibe-player-glass__tint"
              data-part="scrub-bubble"
              data-visible={state.scrubbing}
            >
              {time}
            </span>
          }
          className="vibe-player-glass__track"
          surface={surface}
        />
      ) : (
        <span className="vibe-player-glass__spacer" />
      )}
      {controls.time ? (
        <span
          className={vibePlayerClassName(
            "vibe-player-glass__time",
            classNames.time
          )}
          data-part="time"
        >
          {time}
        </span>
      ) : null}
      {controls.pictureInPicture ? (
        <button
          aria-label={
            state.pictureInPicture
              ? labels.exitPictureInPicture
              : labels.pictureInPicture
          }
          aria-pressed={state.pictureInPicture}
          className={button}
          data-part="picture-in-picture"
          onClick={actions.togglePictureInPicture}
          type="button"
        >
          <PictureInPictureIcon />
        </button>
      ) : null}
      {controls.fullscreen ? (
        <button
          aria-label={labels.fullscreen}
          className={`${button} vibe-player-glass__expand`}
          data-part="fullscreen"
          onClick={actions.toggleFullscreen}
          type="button"
        >
          <EnterFullscreenIcon />
        </button>
      ) : null}
      {controls.mute ? (
        <button
          aria-label={state.muted ? labels.unmute : labels.mute}
          className={button}
          data-part="mute"
          onClick={actions.toggleMute}
          type="button"
        >
          <VibePlayerSwap
            items={[
              { icon: <VolumeIcon />, key: "on", visible: !state.muted },
              { icon: <MuteIcon />, key: "off", visible: state.muted },
            ]}
          />
        </button>
      ) : null}
    </div>
  );
}
