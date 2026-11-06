import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
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
  rootElement: HTMLElement | null;
  togglePlay: () => void;
}

export interface VibePlayerStageRootEvents {
  onBlurCapture: (event: FocusEvent<HTMLElement>) => void;
  onClick: ReturnType<typeof useVibePlayerStageClick>;
  onFocusCapture: (event: FocusEvent<HTMLElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
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

export function useVibePlayerStageRootEvents({
  chrome,
  hideOnPointerLeave,
  rootElement,
  togglePlay,
}: UseVibePlayerStageRootEventsInput): VibePlayerStageRootEvents {
  const pointerType = useRef("mouse");
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
  const onFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (isKeyboardControlFocus(event)) {
        chrome.holdChrome();
      } else {
        // A removed control fires no blur; later focus must not stay pinned.
        chrome.releaseChrome();
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
