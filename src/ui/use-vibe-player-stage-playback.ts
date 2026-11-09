import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { VibePlayerShortcutAction } from "../core";
import { resolveVibePlayerSeekStep } from "../core/vibe-player-seek-step";
import { createIdleCapabilities } from "../core/vibe-player-time";
import { useVibePlayer } from "../react/use-vibe-player";
import {
  useVibePlayerChrome,
  VIBE_PLAYER_CHROME_IDLE_DELAY_MS,
} from "../react/use-vibe-player-chrome";
import { useVibePlayerShortcuts } from "../react/use-vibe-player-shortcuts";
import { useVibePlayerStageActions } from "./use-vibe-player-stage-actions";
import { useVibePlayerStageRootEvents } from "./use-vibe-player-stage-root-events";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";

/** Chrome timing chosen by each assembly. */
export interface VibePlayerStageChromePolicy {
  hideDelayMs: number;
  hideOnPointerLeave: boolean;
  /** Replaces the default shortcut handling (compact surfaces). */
  onShortcut?: (action: VibePlayerShortcutAction) => void;
}

const fullChromePolicy: VibePlayerStageChromePolicy = {
  hideDelayMs: VIBE_PLAYER_CHROME_IDLE_DELAY_MS,
  hideOnPointerLeave: false,
};
const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** State and input binding shared by compact and full chrome. */
export function useVibePlayerStagePlayback(
  {
    autoFocus = false,
    autoHideControls,
    controlsHideDelay,
    controllerRef,
    open = true,
    source,
    title,
    ...options
  }: VibePlayerStageProps,
  policy = fullChromePolicy
) {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const playback = useVibePlayer({
    ...options,
    open,
    presentationTarget: rootElement,
    source,
  });
  const { controller, state } = playback;
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const chrome = useVibePlayerChrome({
    autoHide: autoHideControls ?? true,
    idleDelayMs: controlsHideDelay ?? policy.hideDelayMs,
    open,
    playing:
      state.renewing ||
      (!state.snapshot.paused && state.snapshot.readyState === "playing"),
  });
  const seekStep = resolveVibePlayerSeekStep(options.seekStep);
  const actions = useVibePlayerStageActions({
    controller,
    seekStep,
    setCaptionsEnabled,
    snapshot: state.snapshot,
  });
  const pointerType = useRef("mouse");
  const rootEvents = useVibePlayerStageRootEvents({
    chrome,
    hideOnPointerLeave: policy.hideOnPointerLeave,
    pointerType,
    rootElement,
    togglePlay: actions.togglePlay,
  });
  // Hidden chrome is inert; keep focus (and shortcuts) on the player region.
  useCommitEffect(() => {
    const active = rootElement?.ownerDocument.activeElement;
    if (
      chrome.chromeHidden &&
      active instanceof HTMLElement &&
      active !== rootElement &&
      active.closest("[inert]") &&
      rootElement?.contains(active)
    ) {
      rootElement.focus({ preventScroll: true });
    }
  }, [chrome.chromeHidden, rootElement]);
  useVibePlayerShortcuts({
    canFullscreen: capabilities.canFullscreen,
    canSeek: capabilities.canSeek,
    canShowCaptions: capabilities.canShowCaptions,
    enabled: open && rootElement !== null,
    onShortcut: policy.onShortcut ?? actions.handleShortcut,
    supportsMute: capabilities.supportsMute,
    target: rootElement,
  });
  useImperativeHandle(controllerRef, () => controller, [controller]);
  useEffect(() => {
    if (autoFocus && open) {
      rootElement?.focus({ preventScroll: true });
    }
  }, [autoFocus, open, rootElement]);
  const activeSource = state.currentSource ?? source;
  return {
    ...playback,
    actions,
    activeSource,
    capabilities,
    captionsEnabled,
    chrome,
    playerTitle: title ?? activeSource.title,
    pointerType,
    rootElement,
    rootEvents,
    seekStep,
    setRootElement,
  };
}
