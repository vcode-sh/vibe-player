import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  createIdleCapabilities,
  shouldRevealVibePlayerChromeForKey,
} from "../core";
import {
  useVibePlayerCaptions,
  useVibePlayerChrome,
  useVibePlayerController,
  useVibePlayerShortcuts,
} from "../react";
import { useVibePlayerMediaTarget } from "./use-vibe-player-media-target";
import { useVibePlayerStageActions } from "./use-vibe-player-stage-actions";
import { useVibePlayerStageClick } from "./use-vibe-player-stage-click";
import { VibePlayerCaptionOverlay } from "./vibe-player-caption-overlay";
import { VibePlayerControls } from "./vibe-player-controls";
import { VibePlayerMediaSlot } from "./vibe-player-media-slot";
import { startVibePlayerAutoplay } from "./vibe-player-stage-autoplay";
import { createVibePlayerStageControllerOptions } from "./vibe-player-stage-options";
import { VibePlayerStageStatus } from "./vibe-player-stage-status";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";

export type { VibePlayerStageProps } from "./vibe-player-stage-types";

const useVibePlayerStageEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  const chrome = useVibePlayerChrome({
    autoHide: source.type !== "youtube",
    open,
  });
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source,
    ...(loadCaptionText ? { loadCaptionText } : {}),
  });
  const playerTitle = title ?? source.title;
  const actions = useVibePlayerStageActions({
    controller,
    setCaptionsEnabled,
    snapshot: state.snapshot,
  });

  useVibePlayerStageEffect(() => {
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

  const handleStageClick = useVibePlayerStageClick({
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
        snapshot={state.snapshot}
      />
      <VibePlayerCaptionOverlay lines={captions.activeLines} />
      <VibePlayerControls
        capabilities={capabilities}
        captionsEnabled={captionsEnabled}
        chromeHidden={chrome.chromeHidden}
        onClose={onClose}
        onSeek={actions.seekTo}
        onSetPlaybackRate={actions.setPlaybackRate}
        onSetQuality={actions.setQuality}
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
