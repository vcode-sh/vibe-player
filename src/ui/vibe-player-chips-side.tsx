import type { ReactNode } from "react";
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
import { revealProps, VibePlayerSwap } from "./vibe-player-surface-parts";
import { isVibePlayerSurfacePlaying } from "./vibe-player-surface-phase";
import type { VibePlayerSurface } from "./vibe-player-surface-types";
import { useVibePlayerUI } from "./vibe-player-ui-context";

export const chip = "vibe-player-chips__chip";

interface VibePlayerChipsPartProps {
  surface: VibePlayerSurface;
}

function ChipsDot({ children }: { children: ReactNode }) {
  return <span className={`vibe-player-chips__dot ${chip}`}>{children}</span>;
}

function ChipsSkip({
  side,
  surface,
}: VibePlayerChipsPartProps & { side: -1 | 1 }) {
  const { classNames, labels } = useVibePlayerUI();
  const { controlsVisible, seekStep } = surface.state;
  return (
    <button
      {...revealProps(
        controlsVisible,
        "vibe-player-chips__round vibe-player-chips__skip",
        side < 0 ? "skip-backward" : "skip-forward",
        classNames.button
      )}
      aria-label={
        side < 0 ? labels.seekBackward(seekStep) : labels.seekForward(seekStep)
      }
      onClick={() => surface.actions.seekBy(side * seekStep)}
      type="button"
    >
      <ChipsDot>
        <VibePlayerSkipGlyph side={side} step={seekStep} />
      </ChipsDot>
    </button>
  );
}

function ChipsPictureInPicture({ surface }: VibePlayerChipsPartProps) {
  const { classNames, labels } = useVibePlayerUI();
  const { state } = surface;
  return (
    <button
      {...revealProps(
        state.controlsVisible,
        "vibe-player-chips__round",
        "picture-in-picture",
        classNames.button
      )}
      aria-label={
        state.pictureInPicture
          ? labels.exitPictureInPicture
          : labels.pictureInPicture
      }
      aria-pressed={state.pictureInPicture}
      onClick={surface.actions.togglePictureInPicture}
      type="button"
    >
      <ChipsDot>
        <PictureInPictureIcon />
      </ChipsDot>
    </button>
  );
}

function ChipsFullscreen({ surface }: VibePlayerChipsPartProps) {
  const { classNames, labels } = useVibePlayerUI();
  const { state } = surface;
  return (
    <button
      {...revealProps(
        state.controlsVisible,
        "vibe-player-chips__round vibe-player-chips__expand",
        "fullscreen",
        classNames.button
      )}
      {...getCompactFullscreenProps(state, labels)}
      onClick={surface.actions.toggleFullscreen}
      type="button"
    >
      <ChipsDot>
        <VibePlayerCompactFullscreenIcon state={state} />
      </ChipsDot>
    </button>
  );
}

/** Mute; while playing hidden it stays as Unmute after muted autoplay. */
function ChipsMute({ surface }: VibePlayerChipsPartProps) {
  const { classNames, labels } = useVibePlayerUI();
  const { state } = surface;
  const { controlsVisible } = state;
  const hidden = isVibePlayerSurfacePlaying(state.phase) && !controlsVisible;
  return (
    <button
      {...revealProps(
        controlsVisible || (hidden && state.autoplayMuted),
        "vibe-player-chips__round",
        controlsVisible ? "mute" : "unmute",
        controlsVisible ? classNames.button : classNames.unmute
      )}
      aria-label={state.muted ? labels.unmute : labels.mute}
      onClick={surface.actions.toggleMute}
      type="button"
    >
      <ChipsDot>
        <VibePlayerSwap
          items={[
            { icon: <VolumeIcon />, key: "on", visible: !state.muted },
            { icon: <MuteIcon />, key: "off", visible: state.muted },
          ]}
        />
      </ChipsDot>
    </button>
  );
}

/** Corner controls: skips, Picture-in-Picture, fullscreen and mute. */
export function VibePlayerChipsSide({ surface }: VibePlayerChipsPartProps) {
  const { controls } = surface;
  return (
    <span className="vibe-player-chips__side">
      {controls.skip ? <ChipsSkip side={-1} surface={surface} /> : null}
      {controls.skip ? <ChipsSkip side={1} surface={surface} /> : null}
      {controls.pictureInPicture ? (
        <ChipsPictureInPicture surface={surface} />
      ) : null}
      {controls.fullscreen ? <ChipsFullscreen surface={surface} /> : null}
      {controls.mute ? <ChipsMute surface={surface} /> : null}
    </span>
  );
}
