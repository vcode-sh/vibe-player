import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerResumeStore,
  VibePlayerShortcutAction,
  VibePlayerSource,
} from "../core";
import {
  createIdleCapabilities,
  shouldRevealVibePlayerChromeForKey,
} from "../core";
import {
  useVibePlayerCaptions,
  useVibePlayerChrome,
  useVibePlayerController,
  useVibePlayerShortcuts,
  type VibePlayerCaptionTextLoader,
} from "../react";
import { useVibePlayerMediaTarget } from "./use-vibe-player-media-target";
import { useVibePlayerStageClick } from "./use-vibe-player-stage-click";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerControls } from "./vibe-player-controls";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import { startVibePlayerAutoplay } from "./vibe-player-stage-autoplay";
import { createVibePlayerStageControllerOptions } from "./vibe-player-stage-options";
import { VibePlayerStageStatus } from "./vibe-player-stage-status";

export interface VibePlayerStageProps {
  adapterFactory?:
    | ((source: VibePlayerSource) => VibePlayerAdapter)
    | undefined;
  autoPlay?: boolean;
  autoPlayMutedBootstrap?: boolean;
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  onAnalyticsEvent?: ((event: VibePlayerAnalyticsEvent) => void) | undefined;
  onClose?: (() => void) | undefined;
  open?: boolean;
  resumeStore?: VibePlayerResumeStore | undefined;
  source: VibePlayerSource;
  title?: string | undefined;
  topActions?: ReactNode;
}

export function VibePlayerStage({
  adapterFactory,
  autoPlay = false,
  autoPlayMutedBootstrap = true,
  loadCaptionText,
  onAnalyticsEvent,
  onClose,
  open = true,
  resumeStore,
  source,
  title,
  topActions,
}: VibePlayerStageProps) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const controllerOptions = useMemo(
    () =>
      createVibePlayerStageControllerOptions({
        adapterFactory,
        onAnalyticsEvent,
        resumeStore,
      }),
    [adapterFactory, onAnalyticsEvent, resumeStore]
  );
  const { controller, state } = useVibePlayerController(controllerOptions);
  const { hasMediaTarget, setMediaElement } =
    useVibePlayerMediaTarget(controller);
  const chrome = useVibePlayerChrome({ open });
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source,
    ...(loadCaptionText ? { loadCaptionText } : {}),
  });
  const playerTitle = title ?? source.title;

  useEffect(() => {
    let cancelled = false;

    if (!open) {
      controller.closeSource().catch(() => undefined);
      return;
    }
    if (!hasMediaTarget) {
      return;
    }

    controller
      .load(source)
      .then(() => {
        if (!(autoPlay && !cancelled)) {
          return;
        }
        return startVibePlayerAutoplay({
          controller,
          isCancelled: () => cancelled,
          mutedBootstrap: autoPlayMutedBootstrap,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    autoPlay,
    autoPlayMutedBootstrap,
    controller,
    hasMediaTarget,
    open,
    source,
  ]);

  useEffect(() => {
    if (!(open && rootElement)) {
      return;
    }
    rootElement.focus({ preventScroll: true });
  }, [open, rootElement]);

  const seekRelative = useCallback(
    (seconds: number) => {
      controller
        .seekTo(state.snapshot.currentTime + seconds)
        .catch(() => undefined);
    },
    [controller, state.snapshot.currentTime]
  );

  const togglePlay = useCallback(() => {
    const command = state.snapshot.paused
      ? controller.play()
      : controller.pause();
    command.catch(() => undefined);
  }, [controller, state.snapshot.paused]);

  const handleStageClick = useVibePlayerStageClick({
    rootElement,
    togglePlay,
  });

  const toggleMute = useCallback(() => {
    controller.setMuted(!state.snapshot.muted).catch(() => undefined);
  }, [controller, state.snapshot.muted]);

  const handleShortcut = useCallback(
    (action: VibePlayerShortcutAction) => {
      if (action === "toggle-play") {
        togglePlay();
        return;
      }
      if (action === "toggle-mute") {
        toggleMute();
        return;
      }
      if (action === "seek-backward") {
        seekRelative(-10);
        return;
      }
      if (action === "seek-forward") {
        seekRelative(10);
        return;
      }
      if (action === "fullscreen") {
        controller.enterFullscreen().catch(() => undefined);
        return;
      }
      if (action === "toggle-captions") {
        setCaptionsEnabled((value) => !value);
      }
    },
    [controller, seekRelative, toggleMute, togglePlay]
  );

  useVibePlayerShortcuts({
    canFullscreen: capabilities.canFullscreen,
    canSeek: capabilities.canSeek,
    canShowCaptions: capabilities.canShowCaptions,
    enabled: open,
    onShortcut: handleShortcut,
    supportsMute: capabilities.supportsMute,
    target: rootElement,
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/noNoninteractiveElementInteractions lint/a11y/useKeyWithClickEvents: the focused stage already handles keyboard shortcuts, while pointer clicks only mirror native video toggling.
    <div
      className="vibe-player-stage"
      data-chrome-hidden={chrome.chromeHidden}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        chrome.releaseChrome();
      }}
      onClick={handleStageClick}
      onFocusCapture={(event) => {
        if (event.target === event.currentTarget) {
          chrome.showChrome();
          return;
        }
        chrome.holdChrome();
      }}
      onKeyDownCapture={(event) => {
        if (
          shouldRevealVibePlayerChromeForKey({
            chromeHidden: chrome.chromeHidden,
            key: event.key,
          })
        ) {
          chrome.showChrome();
        }
      }}
      onPointerDown={chrome.showChrome}
      onPointerMove={chrome.showChrome}
      ref={setRootElement}
      tabIndex={-1}
    >
      <VibePlayerMediaSlot onTarget={setMediaElement} />
      <VibePlayerStageStatus
        playbackBlocked={state.playbackBlocked}
        readyState={state.snapshot.readyState}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      <VibePlayerControls
        capabilities={capabilities}
        captionsEnabled={captionsEnabled}
        chromeHidden={chrome.chromeHidden}
        onClose={onClose}
        onSeek={(seconds) => controller.seekTo(seconds).catch(() => undefined)}
        onSetPlaybackRate={(rate) =>
          controller.setPlaybackRate(rate).catch(() => undefined)
        }
        onToggleCaptions={() => setCaptionsEnabled((value) => !value)}
        onToggleFullscreen={() =>
          controller.enterFullscreen().catch(() => undefined)
        }
        onToggleMute={toggleMute}
        onTogglePictureInPicture={() =>
          controller.enterPictureInPicture().catch(() => undefined)
        }
        onTogglePlay={togglePlay}
        snapshot={state.snapshot}
        title={playerTitle}
        topActions={topActions}
      />
    </div>
  );
}
