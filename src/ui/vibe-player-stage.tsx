import { useCallback, useEffect, useMemo, useState } from "react";
import { createVibePlayerAdapter } from "../adapters";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
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
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerControls } from "./vibe-player-controls";

export interface VibePlayerStageProps {
  adapterFactory?:
    | ((source: VibePlayerSource) => VibePlayerAdapter)
    | undefined;
  loadCaptionText?: VibePlayerCaptionTextLoader | undefined;
  onAnalyticsEvent?: ((event: VibePlayerAnalyticsEvent) => void) | undefined;
  onClose?: (() => void) | undefined;
  open?: boolean;
  resumeStore?: VibePlayerResumeStore | undefined;
  source: VibePlayerSource;
  title?: string | undefined;
}

function createControllerOptions({
  adapterFactory,
  onAnalyticsEvent,
  resumeStore,
}: Pick<
  VibePlayerStageProps,
  "adapterFactory" | "onAnalyticsEvent" | "resumeStore"
>): VibePlayerControllerOptions {
  const options: VibePlayerControllerOptions = {
    adapterFactory: adapterFactory ?? createVibePlayerAdapter,
  };
  if (onAnalyticsEvent) {
    options.onAnalyticsEvent = onAnalyticsEvent;
  }
  if (resumeStore) {
    options.resumeStore = resumeStore;
  }
  return options;
}

export function VibePlayerStage({
  adapterFactory,
  loadCaptionText,
  onAnalyticsEvent,
  onClose,
  open = true,
  resumeStore,
  source,
  title,
}: VibePlayerStageProps) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const controllerOptions = useMemo(
    () =>
      createControllerOptions({
        adapterFactory,
        onAnalyticsEvent,
        resumeStore,
      }),
    [adapterFactory, onAnalyticsEvent, resumeStore]
  );
  const { controller, setTarget, state } =
    useVibePlayerController(controllerOptions);
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
    if (!open) {
      controller.pause().catch(() => undefined);
      return;
    }
    controller.load(source).catch(() => undefined);
  }, [controller, open, source]);

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
      <div className="vibe-player-stage__media" ref={setTarget} />
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
        onTogglePlay={togglePlay}
        snapshot={state.snapshot}
        title={playerTitle}
      />
    </div>
  );
}
