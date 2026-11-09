import { useImperativeHandle, useRef, useState } from "react";
import type {
  VibePlayerControllerState,
  VibePlayerShortcutAction,
} from "../core";
import { resolveVibePlayerSeekStep } from "../core/vibe-player-seek-step";
import { createIdleCapabilities } from "../core/vibe-player-time";
import {
  type UseVibePlayerOptions,
  useVibePlayer,
} from "../react/use-vibe-player";
import {
  useVibePlayerChrome,
  VIBE_PLAYER_CHROME_IDLE_DELAY_MS,
  type VibePlayerChromeState,
} from "../react/use-vibe-player-chrome";
import {
  type UseVibePlayerStageActionsInput,
  useVibePlayerStageActions,
} from "./use-vibe-player-stage-actions";
import { useVibePlayerStageFocusReturn } from "./use-vibe-player-stage-focus-return";
import { useVibePlayerStageRootEvents } from "./use-vibe-player-stage-root-events";
import { useVibePlayerStageShortcuts } from "./use-vibe-player-stage-shortcuts";
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

/** State and input binding shared by compact and full chrome. */
export function useVibePlayerStagePlayback(
  props: VibePlayerStageProps,
  policy = fullChromePolicy
) {
  const { open = true, source, title } = props;
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const playback = useVibePlayer(getVibePlayerOptions(props, rootElement));
  const { controller, state } = playback;
  const capabilities = state.capabilities ?? createIdleCapabilities();
  const chrome = useVibePlayerStageChrome(props, policy, state);
  const seekStep = resolveVibePlayerSeekStep(props.seekStep);
  const { actions, pointerType, rootEvents } = useVibePlayerStageCommands({
    chrome,
    controller,
    policy,
    rootElement,
    seekStep,
    setCaptionsEnabled,
    snapshot: state.snapshot,
  });
  useVibePlayerStageFocusReturn(props, chrome.chromeHidden, rootElement);
  const announcer = useVibePlayerStageShortcuts({
    capabilities,
    controller,
    enabled: open && rootElement !== null,
    onShortcut: policy.onShortcut ?? actions.handleShortcut,
    rootElement,
  });
  useImperativeHandle(props.controllerRef, () => controller, [controller]);
  const activeSource = state.currentSource ?? source;
  return {
    ...playback,
    actions,
    activeSource,
    announcer,
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

interface UseVibePlayerStageCommandsInput
  extends UseVibePlayerStageActionsInput {
  chrome: VibePlayerChromeState;
  policy: VibePlayerStageChromePolicy;
  rootElement: HTMLElement | null;
}

/** Commands, pointer type tracking and the root's chrome and focus events. */
function useVibePlayerStageCommands({
  chrome,
  policy,
  rootElement,
  ...input
}: UseVibePlayerStageCommandsInput) {
  const actions = useVibePlayerStageActions(input);
  const pointerType = useRef("mouse");
  const rootEvents = useVibePlayerStageRootEvents({
    chrome,
    hideOnPointerLeave: policy.hideOnPointerLeave,
    pointerType,
    rootElement,
    togglePlay: actions.togglePlay,
  });
  return { actions, pointerType, rootEvents };
}

/** Playback options without the Stage-only props; fullscreen shows the root. */
function getVibePlayerOptions(
  props: VibePlayerStageProps,
  rootElement: HTMLElement | null
): UseVibePlayerOptions {
  const {
    autoFocus: _autoFocus,
    autoHideControls: _autoHide,
    controlsHideDelay: _hideDelay,
    controllerRef: _controllerRef,
    open = true,
    title: _title,
    ...options
  } = props;
  return { ...options, open, presentationTarget: rootElement };
}

function useVibePlayerStageChrome(
  props: VibePlayerStageProps,
  policy: VibePlayerStageChromePolicy,
  state: VibePlayerControllerState
) {
  return useVibePlayerChrome({
    autoHide: props.autoHideControls ?? true,
    idleDelayMs: props.controlsHideDelay ?? policy.hideDelayMs,
    open: props.open ?? true,
    playing:
      state.renewing ||
      (!state.snapshot.paused && state.snapshot.readyState === "playing"),
  });
}
