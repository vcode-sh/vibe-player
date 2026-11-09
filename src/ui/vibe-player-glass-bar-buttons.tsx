import {
  getCompactFullscreenProps,
  VibePlayerCompactFullscreenIcon,
} from "./vibe-player-compact-fullscreen";
import {
  MuteIcon,
  PictureInPictureIcon,
  VolumeIcon,
} from "./vibe-player-icons";
import { VibePlayerSkipGlyph } from "./vibe-player-skip-glyph";
import { VibePlayerSwap } from "./vibe-player-surface-parts";
import type { VibePlayerSurface } from "./vibe-player-surface-types";
import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerGlassButtonProps {
  /** Shared capsule button class, including the host's `button` class. */
  button: string;
  surface: VibePlayerSurface;
}

/** Skip back or forward by `seekStep`; only when `controls.skip` is on. */
export function VibePlayerGlassSkip({
  button,
  side,
  surface,
}: VibePlayerGlassButtonProps & { side: -1 | 1 }) {
  const { labels } = useVibePlayerUI();
  const { actions, controls, state } = surface;
  if (!controls.skip) {
    return null;
  }
  return (
    <button
      aria-label={
        side < 0
          ? labels.seekBackward(state.seekStep)
          : labels.seekForward(state.seekStep)
      }
      className={`${button} vibe-player-glass__skip`}
      data-part={side < 0 ? "skip-backward" : "skip-forward"}
      onClick={() => actions.seekBy(side * state.seekStep)}
      type="button"
    >
      <VibePlayerSkipGlyph side={side} step={state.seekStep} />
    </button>
  );
}

/** The capsule's end: Picture-in-Picture, fullscreen and mute. */
export function VibePlayerGlassEndButtons({
  button,
  surface,
}: VibePlayerGlassButtonProps) {
  const { labels } = useVibePlayerUI();
  const { actions, controls, state } = surface;
  return (
    <>
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
          {...getCompactFullscreenProps(state, labels)}
          className={`${button} vibe-player-glass__expand`}
          data-part="fullscreen"
          onClick={actions.toggleFullscreen}
          type="button"
        >
          <VibePlayerCompactFullscreenIcon state={state} />
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
    </>
  );
}
