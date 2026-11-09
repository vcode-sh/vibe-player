import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { shouldRevealVibePlayerChromeForKey } from "../core";
import type { VibePlayerChromeState } from "../react";
import { useVibePlayerStageClick } from "./use-vibe-player-stage-click";

export interface UseVibePlayerStageRootEventsInput {
  chrome: VibePlayerChromeState;
  /** Compact surfaces clear the video as soon as a mouse leaves. */
  hideOnPointerLeave: boolean;
  /** The last pointer's type; touch clicks never toggle playback. */
  pointerType: RefObject<string>;
  rootElement: HTMLElement | null;
  togglePlay: () => void;
}

export interface VibePlayerStageRootEvents {
  onBlurCapture: (event: FocusEvent<HTMLElement>) => void;
  onClick: ReturnType<typeof useVibePlayerStageClick>;
  onFocusCapture: (event: FocusEvent<HTMLElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerDownCapture: () => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Only keyboard focus on a control pins the chrome. A pressed button keeps
 * pointer focus, which must not stop playing media from clearing its controls.
 */
export function isKeyboardControlFocus(
  event: FocusEvent<HTMLElement>
): boolean {
  const { currentTarget, target } = event;
  if (target === currentTarget) {
    return false;
  }
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** Focus this soon after a press came from the pointer, not from navigation. */
const pointerFocusWindowMs = 1000;

/**
 * Focus arriving by keyboard or assistive technology reveals hidden chrome,
 * which is inert until then. Pointer presses keep their own policy (a touch
 * tap toggles), and the player returning focus to its region from an inner
 * control that just hid must not bring the chrome back.
 */
function shouldRevealOnFocus(
  event: FocusEvent<HTMLElement>,
  lastPointerDown: number
): boolean {
  if (performance.now() - lastPointerDown < pointerFocusWindowMs) {
    return false;
  }
  const { currentTarget, relatedTarget, target } = event;
  return !(
    target === currentTarget &&
    relatedTarget instanceof Node &&
    currentTarget.contains(relatedTarget)
  );
}

export function useVibePlayerStageRootEvents({
  chrome,
  hideOnPointerLeave,
  pointerType,
  rootElement,
  togglePlay,
}: UseVibePlayerStageRootEventsInput): VibePlayerStageRootEvents {
  const onClick = useVibePlayerStageClick({
    pointerType,
    rootElement,
    togglePlay,
  });
  const onBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }
      chrome.releaseChrome();
    },
    [chrome]
  );
  const lastPointerDown = useRef(Number.NEGATIVE_INFINITY);
  const onFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (isKeyboardControlFocus(event)) {
        chrome.holdChrome();
        return;
      }
      // A removed control fires no blur; later focus must not stay pinned.
      chrome.releaseChrome();
      if (shouldRevealOnFocus(event, lastPointerDown.current)) {
        chrome.showChrome();
      }
    },
    [chrome]
  );
  const onKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (
        shouldRevealVibePlayerChromeForKey({
          chromeHidden: chrome.chromeHidden,
          key: event.key,
        })
      ) {
        // Hidden chrome is inert: un-inert it before the browser moves focus.
        flushSync(() => chrome.showChrome());
      }
    },
    [chrome]
  );
  return {
    onBlurCapture,
    onClick,
    onFocusCapture,
    onKeyDownCapture,
    onPointerDown: (event) => {
      pointerType.current = event.pointerType;
      chrome.showChrome();
    },
    onPointerDownCapture: () => {
      lastPointerDown.current = performance.now();
    },
    onPointerLeave: (event) => {
      if (hideOnPointerLeave && event.pointerType !== "touch") {
        chrome.hideChrome();
      }
    },
    onPointerMove: (event) => {
      if (event.pointerType !== "touch") {
        chrome.showChrome();
      }
    },
  };
}
