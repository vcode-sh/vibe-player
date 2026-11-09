import type { ReactNode } from "react";
import type { useVibePlayerCaptions } from "../react/use-vibe-player-captions";
import type { VibePlayerStagePlayback } from "./use-vibe-player-full-stage-bindings";
import { VibePlayerAnnouncer } from "./vibe-player-announcer";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerCaptionStatusNotice } from "./vibe-player-caption-status";
import { VibePlayerControls } from "./vibe-player-controls";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import {
  VibePlayerStageStatusPanel,
  type VibePlayerStageStatusView,
} from "./vibe-player-stage-status";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { VibePlayerStartSurface } from "./vibe-player-start-surface";
import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerFullStageLayersProps {
  captions: ReturnType<typeof useVibePlayerCaptions>;
  indicator: ReactNode;
  playback: VibePlayerStagePlayback;
  props: VibePlayerStageProps;
  statusView: VibePlayerStageStatusView | null;
}

/** Everything inside the full stage region, bottom layer first. */
export function VibePlayerFullStageLayers({
  captions,
  indicator,
  playback,
  props,
  statusView,
}: VibePlayerFullStageLayersProps) {
  const { classNames } = useVibePlayerUI();
  const { activeSource, controller, rootElement, state } = playback;
  return (
    <>
      <VibePlayerMediaSlot
        className={classNames.media}
        onTarget={playback.setTarget}
      />
      <VibePlayerStartSurface
        controller={controller}
        snapshot={state.snapshot}
        source={activeSource}
      />
      <VibePlayerAnnouncer message={playback.announcer.message} />
      <VibePlayerStageStatusPanel
        live={false}
        onRetry={() => {
          controller.retry().catch(() => undefined);
        }}
        view={statusView}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      {indicator}
      <VibePlayerCaptionStatusNotice
        error={captions.error}
        onRetry={() => {
          rootElement?.focus({ preventScroll: true });
          captions.retry();
        }}
      />
      <VibePlayerFullStageControls playback={playback} props={props} />
    </>
  );
}

function VibePlayerFullStageControls({
  playback,
  props,
}: Pick<VibePlayerFullStageLayersProps, "playback" | "props">) {
  const { actions, capabilities, captionsEnabled, chrome, state } = playback;
  return (
    <VibePlayerControls
      capabilities={capabilities}
      captionsEnabled={captionsEnabled}
      chromeHidden={chrome.chromeHidden}
      onClose={props.onClose}
      onSeek={actions.seekTo}
      onSetMuted={actions.setMuted}
      onSetPlaybackRate={actions.setPlaybackRate}
      onSetQuality={actions.setQuality}
      onSetVolume={actions.setVolume}
      onSkip={props.controls?.skip === false ? undefined : actions.seekBy}
      onToggleCaptions={actions.toggleCaptions}
      onToggleFullscreen={actions.toggleFullscreen}
      onToggleMute={actions.toggleMute}
      onTogglePictureInPicture={actions.togglePictureInPicture}
      onTogglePlay={actions.togglePlay}
      seekStep={playback.seekStep}
      seekThumbnails={props.seekThumbnails}
      snapshot={state.snapshot}
      title={playback.playerTitle}
      topActions={props.topActions}
    />
  );
}
