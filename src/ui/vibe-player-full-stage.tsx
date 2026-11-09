import { useMemo } from "react";
import { useVibePlayerCaptions } from "../react/use-vibe-player-captions";
import { useVibePlayerStatusAnnouncement } from "./use-vibe-player-announcer";
import { useVibePlayerStageGestures } from "./use-vibe-player-stage-gestures";
import { useVibePlayerStageObservers } from "./use-vibe-player-stage-observers";
import { useVibePlayerStagePlayback } from "./use-vibe-player-stage-playback";
import { VibePlayerAnnouncer } from "./vibe-player-announcer";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerCaptionStatusNotice } from "./vibe-player-caption-status";
import { VibePlayerControls } from "./vibe-player-controls";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import {
  useVibePlayerStageStatusView,
  VibePlayerStageStatus,
} from "./vibe-player-stage-status";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { VibePlayerStartSurface } from "./vibe-player-start-surface";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

export function VibePlayerFullStage(props: VibePlayerStageProps) {
  const { classNames, labels } = useVibePlayerUI();
  const playback = useVibePlayerStagePlayback(props);
  const {
    actions,
    activeSource,
    capabilities,
    captionsEnabled,
    chrome,
    controller,
    playerTitle,
    rootElement,
    state,
  } = playback;
  const gestures = useVibePlayerStageGestures(
    playback,
    props.gestures?.doubleTapSeek ?? true
  );
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source: state.capabilities ? state.currentSource : null,
    ...(props.loadCaptionText
      ? { loadCaptionText: props.loadCaptionText }
      : {}),
  });
  const captionStatus = useMemo(
    () => ({
      error: captions.error,
      loading: captions.loading,
      track: captions.track,
    }),
    [captions.error, captions.loading, captions.track]
  );
  useVibePlayerStageObservers({
    captionStatus,
    controller,
    onCaptionStatusChange: props.onCaptionStatusChange,
    onError: props.onError,
    onStateChange: props.onStateChange,
    source: activeSource,
    state,
  });
  const statusView = useVibePlayerStageStatusView({
    playbackBlocked: state.playbackBlocked,
    snapshot: state.snapshot,
  });
  useVibePlayerStatusAnnouncement(
    playback.announcer.announce,
    statusView?.label ?? null
  );
  return (
    <section
      aria-label={
        playerTitle ? labels.videoPlayerTitle(playerTitle) : labels.videoPlayer
      }
      className={vibePlayerClassName(
        "vibe-player-stage",
        props.className,
        classNames.root
      )}
      data-chrome-hidden={chrome.chromeHidden}
      data-fit={props.fit === "cover" ? "cover" : undefined}
      data-seek-thumbnails={props.seekThumbnails?.length ? true : undefined}
      data-state={state.snapshot.readyState}
      data-variant="full"
      {...gestures.events}
      ref={playback.setRootElement}
      style={getVibePlayerFrameStyle({
        maxRatio: props.maxRatio,
        minRatio: props.minRatio,
        snapshot: state.snapshot,
        source: activeSource,
        style: props.style,
      })}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The named player region owns focused media keyboard shortcuts.
      tabIndex={0}
    >
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
      <VibePlayerStageStatus
        live={false}
        onRetry={() => {
          controller.retry().catch(() => undefined);
        }}
        playbackBlocked={state.playbackBlocked}
        snapshot={state.snapshot}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      {gestures.indicator}
      <VibePlayerCaptionStatusNotice
        error={captions.error}
        onRetry={() => {
          rootElement?.focus({ preventScroll: true });
          captions.retry();
        }}
      />
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
        title={playerTitle}
        topActions={props.topActions}
      />
    </section>
  );
}
