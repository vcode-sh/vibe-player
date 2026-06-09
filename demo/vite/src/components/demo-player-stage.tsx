import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createIdleCapabilities,
  createVibePlayerAdapter,
  useVibePlayerCaptions,
  useVibePlayerChrome,
  useVibePlayerController,
  useVibePlayerShortcuts,
  type VibePlayerAnalyticsEvent,
  VibePlayerCaptionOverlay,
  type VibePlayerControllerState,
  VibePlayerControls,
  type VibePlayerResumeStore,
  type VibePlayerSource,
  VibePlayerStageStatus,
} from "vibe-player";
import { useDemoPlayerStageActions } from "./demo-player-stage-actions";
import { startDemoAutoplay } from "./demo-player-stage-autoplay";
import { DemoPlayerStageRoot } from "./demo-player-stage-root";

interface DemoPlayerStageProps {
  autoPlay?: boolean;
  autoPlayMutedBootstrap?: boolean;
  onAnalyticsEvent: (event: VibePlayerAnalyticsEvent) => void;
  onStateChange: (state: VibePlayerControllerState) => void;
  resumeStore: VibePlayerResumeStore;
  source: VibePlayerSource;
  title: string;
  topActions?: ReactNode;
}

export function DemoPlayerStage({
  autoPlay = false,
  autoPlayMutedBootstrap = true,
  onAnalyticsEvent,
  onStateChange,
  resumeStore,
  source,
  title,
  topActions,
}: DemoPlayerStageProps) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [hasMediaTarget, setHasMediaTarget] = useState(false);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const controllerOptions = useMemo(
    () => ({
      adapterFactory: createVibePlayerAdapter,
      onAnalyticsEvent,
      resumeStore,
    }),
    [onAnalyticsEvent, resumeStore]
  );
  const { controller, setTarget, state } =
    useVibePlayerController(controllerOptions);
  const chrome = useVibePlayerChrome({
    autoHide: false,
    open: true,
  });
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source,
  });
  const {
    handleShortcut,
    seekTo,
    setMuted,
    setPlaybackRate,
    setQuality,
    setVolume,
    toggleCaptions,
    toggleFullscreen,
    toggleMute,
    togglePictureInPicture,
    togglePlay,
  } = useDemoPlayerStageActions({
    controller,
    currentTime: state.snapshot.currentTime,
    muted: state.snapshot.muted,
    paused: state.snapshot.paused,
    setCaptionsEnabled,
  });

  useEffect(() => {
    onStateChange(state);
  }, [onStateChange, state]);

  useEffect(() => {
    let cancelled = false;

    if (!hasMediaTarget) {
      return;
    }
    controller
      .load(source)
      .then(() => {
        if (!(autoPlay && !cancelled)) {
          return;
        }
        return startDemoAutoplay({
          controller,
          isCancelled: () => cancelled,
          mutedBootstrap: autoPlayMutedBootstrap,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [autoPlay, autoPlayMutedBootstrap, controller, hasMediaTarget, source]);

  useEffect(() => {
    rootElement?.focus({ preventScroll: true });
  }, [rootElement]);

  const handleMediaTarget = useCallback(
    (element: HTMLDivElement | null) => {
      setHasMediaTarget(Boolean(element));
      setTarget(element);
    },
    [setTarget]
  );

  useVibePlayerShortcuts({
    canFullscreen: capabilities.canFullscreen,
    canSeek: capabilities.canSeek,
    canShowCaptions: capabilities.canShowCaptions,
    enabled: true,
    onShortcut: handleShortcut,
    supportsMute: capabilities.supportsMute,
    target: rootElement,
  });

  return (
    <DemoPlayerStageRoot
      chromeHidden={chrome.chromeHidden}
      holdChrome={chrome.holdChrome}
      releaseChrome={chrome.releaseChrome}
      setRootElement={setRootElement}
      showChrome={chrome.showChrome}
      togglePlay={togglePlay}
    >
      <div className="vibe-player-stage__media" ref={handleMediaTarget} />
      <VibePlayerStageStatus
        playbackBlocked={state.playbackBlocked}
        snapshot={state.snapshot}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      <VibePlayerControls
        capabilities={capabilities}
        captionsEnabled={captionsEnabled}
        chromeHidden={chrome.chromeHidden}
        onSeek={seekTo}
        onSetMuted={setMuted}
        onSetPlaybackRate={setPlaybackRate}
        onSetQuality={setQuality}
        onSetVolume={setVolume}
        onToggleCaptions={toggleCaptions}
        onToggleFullscreen={toggleFullscreen}
        onToggleMute={toggleMute}
        onTogglePictureInPicture={togglePictureInPicture}
        onTogglePlay={togglePlay}
        snapshot={state.snapshot}
        title={title}
        topActions={topActions}
      />
    </DemoPlayerStageRoot>
  );
}
