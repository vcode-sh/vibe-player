import { useEffect, useEffectEvent, useState } from "react";
import { createIdleCapabilities } from "../core";
import {
  useVibePlayer,
  useVibePlayerCaptions,
  useVibePlayerChrome,
  useVibePlayerShortcuts,
} from "../react";
import { useVibePlayerStageActions } from "./use-vibe-player-stage-actions";
import { useVibePlayerStageRootEvents } from "./use-vibe-player-stage-root-events";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerControls } from "./vibe-player-controls";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import { VibePlayerStageStatus } from "./vibe-player-stage-status";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";

export type { VibePlayerStageProps } from "./vibe-player-stage-types";

export function VibePlayerStage({
  adapterFactory,
  autoHideControls,
  autoPlay = false,
  autoPlayMutedBootstrap = true,
  loadCaptionText,
  onAnalyticsEvent,
  onClose,
  onError,
  onStateChange,
  open = true,
  resumeStore,
  source,
  title,
  topActions,
}: VibePlayerStageProps) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const { controller, setTarget, state } = useVibePlayer({
    adapterFactory,
    autoPlay,
    autoPlayMutedBootstrap,
    onAnalyticsEvent,
    onError,
    open,
    resumeStore,
    source,
  });
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const chrome = useVibePlayerChrome({
    autoHide: !capabilities.keepsControlsVisible && (autoHideControls ?? true),
    open,
  });
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source: state.currentSource,
    ...(loadCaptionText ? { loadCaptionText } : {}),
  });
  const playerTitle = title ?? source.title;
  const actions = useVibePlayerStageActions({
    controller,
    setCaptionsEnabled,
    snapshot: state.snapshot,
  });

  const notifyStateChange = useEffectEvent(onStateChange ?? (() => undefined));
  useEffect(() => {
    notifyStateChange(state);
  }, [state]);

  useEffect(() => {
    if (!(open && rootElement)) {
      return;
    }
    rootElement.focus({ preventScroll: true });
  }, [open, rootElement]);

  const rootEvents = useVibePlayerStageRootEvents({
    chrome,
    rootElement,
    togglePlay: actions.togglePlay,
  });

  useVibePlayerShortcuts({
    canFullscreen: capabilities.canFullscreen,
    canSeek: capabilities.canSeek,
    canShowCaptions: capabilities.canShowCaptions,
    enabled: open,
    onShortcut: actions.handleShortcut,
    supportsMute: capabilities.supportsMute,
    target: rootElement,
  });

  return (
    <div
      className="vibe-player-stage"
      data-chrome-hidden={chrome.chromeHidden}
      {...rootEvents}
      ref={setRootElement}
      tabIndex={-1}
    >
      <VibePlayerMediaSlot onTarget={setTarget} />
      <VibePlayerStageStatus
        playbackBlocked={state.playbackBlocked}
        snapshot={state.snapshot}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      <VibePlayerControls
        capabilities={capabilities}
        captionsEnabled={captionsEnabled}
        chromeHidden={chrome.chromeHidden}
        onClose={onClose}
        onSeek={actions.seekTo}
        onSetMuted={actions.setMuted}
        onSetPlaybackRate={actions.setPlaybackRate}
        onSetQuality={actions.setQuality}
        onSetVolume={actions.setVolume}
        onToggleCaptions={actions.toggleCaptions}
        onToggleFullscreen={actions.toggleFullscreen}
        onToggleMute={actions.toggleMute}
        onTogglePictureInPicture={actions.togglePictureInPicture}
        onTogglePlay={actions.togglePlay}
        snapshot={state.snapshot}
        title={playerTitle}
        topActions={topActions}
      />
    </div>
  );
}
