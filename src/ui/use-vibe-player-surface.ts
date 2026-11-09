import { type FocusEvent, useEffect, useMemo, useRef, useState } from "react";
import type { VibePlayerCapabilities, VibePlayerShortcutAction } from "../core";
import { useVibePlayerDelayedFlag } from "../react/use-vibe-player-delayed-flag";
import { useVibePlayerStagePlayback } from "./use-vibe-player-stage-playback";
import { isKeyboardControlFocus } from "./use-vibe-player-stage-root-events";
import { useVibePlayerSurfaceInput } from "./use-vibe-player-surface-input";
import { useVibePlayerSurfaceScrub } from "./use-vibe-player-surface-scrub";
import { useVibePlayerTapSeek } from "./use-vibe-player-tap-seek";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import {
  canScrubVibePlayerSurface,
  getVibePlayerSurfaceBusyDelay,
  getVibePlayerSurfacePhase,
  isVibePlayerSurfacePlaying,
} from "./vibe-player-surface-phase";
import type {
  VibePlayerCompactControls,
  VibePlayerCompactSkin,
  VibePlayerSurface,
  VibePlayerSurfaceActions,
  VibePlayerSurfacePhase,
} from "./vibe-player-surface-types";

export interface UseVibePlayerSurfaceOptions extends VibePlayerStageProps {
  controls?: VibePlayerCompactControls | undefined;
  onExpand?: (() => void) | undefined;
}

/** Host choices narrowed by what the provider can honestly do. */
function getVibePlayerSurfaceControls(
  { controls, onExpand }: UseVibePlayerSurfaceOptions,
  capabilities: VibePlayerCapabilities
): VibePlayerSurface["controls"] {
  return {
    centerButton: controls?.centerButton ?? "always",
    fullscreen:
      (controls?.fullscreen ?? true) &&
      (onExpand !== undefined || capabilities.canFullscreen),
    mute: (controls?.mute ?? true) && capabilities.supportsMute,
    pictureInPicture:
      (controls?.pictureInPicture ?? false) && capabilities.canPictureInPicture,
    seek: (controls?.seek ?? true) && capabilities.canSeek,
    skip: (controls?.skip ?? false) && capabilities.canSeek,
    time: controls?.time ?? true,
  };
}
const ignore = () => undefined;

/** Compact surface: chrome policy, phase, busy delays, scrub and input. */
export function useVibePlayerSurface(
  props: UseVibePlayerSurfaceOptions,
  skin: VibePlayerCompactSkin
) {
  const shortcut = useRef<(action: VibePlayerShortcutAction) => void>(ignore);
  const chips = skin === "chips";
  const policy = useMemo(
    () => ({
      hideDelayMs: chips ? 1200 : 1400,
      hideOnPointerLeave: true,
      onShortcut: (action: VibePlayerShortcutAction) =>
        shortcut.current(action),
    }),
    [chips]
  );
  const playback = useVibePlayerStagePlayback(props, policy);
  const { activeSource, capabilities, chrome, controller, state } = playback;
  const stage = playback.actions;
  const { snapshot } = state;
  const previous = useRef<VibePlayerSurfacePhase>("idle");
  const phase = getVibePlayerSurfacePhase(
    snapshot,
    state.renewing,
    previous.current
  );
  useEffect(() => {
    previous.current = phase;
  });
  const busyDelay = getVibePlayerSurfaceBusyDelay(phase, snapshot.readyState);
  const busy = useVibePlayerDelayedFlag(busyDelay !== null, busyDelay);
  const [keyboardHold, setKeyboardHold] = useState(false);
  const [muteTouched, setMuteTouched] = useState(false);
  const duration = snapshot.duration || activeSource.durationSeconds || 0;
  const scrub = useVibePlayerSurfaceScrub({
    currentTime: snapshot.currentTime,
    duration,
    hold: chrome.holdChrome,
    release: () => {
      if (!keyboardHold) {
        chrome.releaseChrome();
        chrome.showChrome();
      }
    },
    seekTo: stage.seekTo,
  });
  const playing = isVibePlayerSurfacePlaying(phase);
  const controlsVisible =
    scrub.scrubbing || phase === "paused" || (playing && !chrome.chromeHidden);
  const live = scrub.previewTime ?? snapshot.currentTime;
  const shownTime = useRef(live);
  if (controlsVisible || !playing) {
    shownTime.current = live;
  }
  let hold: VibePlayerSurface["state"]["hold"] = null;
  if (scrub.scrubbing) {
    hold = "scrub";
  } else if (keyboardHold) {
    hold = "keyboard-focus";
  } else if (!playing) {
    hold = "phase";
  }
  const run = (command: Promise<void>) => command.catch(ignore);
  const actions: VibePlayerSurfaceActions = {
    hideControls: chrome.hideChrome,
    pause: () => run(controller.pause()),
    play: () => run(controller.play()),
    primary: () => {
      if (phase === "error") {
        run(controller.retry());
      } else if (playing) {
        run(controller.pause());
      } else if (phase !== "loading") {
        run(controller.play());
      }
    },
    retry: () => run(controller.retry()),
    revealControls: chrome.showChrome,
    scrubEnd: scrub.scrubEnd,
    scrubStart: scrub.scrubStart,
    scrubTo: scrub.scrubTo,
    seekBy: (seconds) => {
      if (canScrubVibePlayerSurface(phase) && capabilities.canSeek) {
        scrub.seekBy(seconds);
      }
    },
    setMuted: (muted) => {
      setMuteTouched(true);
      stage.setMuted(muted);
    },
    toggleFullscreen: props.onExpand ?? stage.toggleFullscreen,
    toggleMute: () => {
      setMuteTouched(true);
      stage.toggleMute();
    },
    togglePictureInPicture: stage.togglePictureInPicture,
  };
  const surface: VibePlayerSurface = {
    actions,
    controls: getVibePlayerSurfaceControls(props, capabilities),
    state: {
      autoplayMuted:
        Boolean(props.autoPlay || props.autoplayWhenVisible) &&
        snapshot.muted &&
        !muteTouched,
      busy,
      capabilities,
      controlsVisible,
      duration,
      error: state.error,
      hold,
      muted: snapshot.muted,
      phase,
      pictureInPicture: snapshot.isPictureInPicture ?? false,
      previewTime: scrub.previewTime,
      scrubbing: scrub.scrubbing,
      seekStep: playback.seekStep,
      time: shownTime.current,
    },
  };
  shortcut.current = (action) => {
    if (action === "toggle-play") {
      actions.primary();
    } else if (action === "toggle-mute") {
      actions.toggleMute();
    } else if (action === "seek-backward" || action === "seek-forward") {
      const sign = action === "seek-forward" ? 1 : -1;
      actions.seekBy(sign * playback.seekStep);
    } else if (action === "fullscreen" && surface.controls.fullscreen) {
      actions.toggleFullscreen();
    }
  };
  const tapSeek = useVibePlayerTapSeek({
    duration,
    enabled:
      capabilities.canSeek && canScrubVibePlayerSurface(phase) && duration > 0,
    getTime: () => controller.getState().snapshot.currentTime,
    requested: props.gestures?.doubleTapSeek ?? false,
    seekTo: stage.seekTo,
    step: playback.seekStep,
  });
  const input = useVibePlayerSurfaceInput({
    actions,
    doubleTap: tapSeek.tap,
    dragToScrub: chips,
    state: surface.state,
  });
  const { rootElement, rootEvents } = playback;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-check focus whenever parts hide.
  useEffect(() => {
    const active = rootElement?.ownerDocument.activeElement;
    // A control that just hid is inert; keep focus (and shortcuts) here.
    if (
      active instanceof HTMLElement &&
      active !== rootElement &&
      rootElement?.contains(active) &&
      active.closest("[inert]")
    ) {
      rootElement.focus({ preventScroll: true });
    }
  }, [controlsVisible, phase, rootElement]);
  const events = {
    ...rootEvents,
    ...input,
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      rootEvents.onBlurCapture(event);
      const next = event.relatedTarget;
      if (!(next instanceof Node && event.currentTarget.contains(next))) {
        setKeyboardHold(false);
      }
    },
    onFocusCapture: (event: FocusEvent<HTMLElement>) => {
      rootEvents.onFocusCapture(event);
      setKeyboardHold(isKeyboardControlFocus(event));
    },
  };
  return { events, indicator: tapSeek.indicator, playback, surface };
}
