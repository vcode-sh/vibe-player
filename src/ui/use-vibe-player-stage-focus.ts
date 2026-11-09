import { type FocusEvent, useCallback, useRef } from "react";
import type { VibePlayerChromeState } from "../react";

/** Focus this soon after a press came from the pointer, not from navigation. */
const pointerFocusWindowMs = 1000;

export interface VibePlayerStageFocusEvents {
  onBlurCapture: (event: FocusEvent<HTMLElement>) => void;
  /** Applies the focus policy; true when the focus holds the chrome open. */
  onFocusCapture: (event: FocusEvent<HTMLElement>) => boolean;
  onPointerDownCapture: () => void;
}

function matchesFocusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** The player returning focus to its region from a control that just hid. */
function isInnerRefocus(event: FocusEvent<HTMLElement>): boolean {
  const { currentTarget, relatedTarget, target } = event;
  return (
    target === currentTarget &&
    relatedTarget instanceof Node &&
    currentTarget.contains(relatedTarget)
  );
}

/**
 * Focus policy for the player region. Focus on a control from the keyboard
 * or assistive technology holds the chrome open; a pointer press does not,
 * so playing media still clears controls after a click. Focus arriving in
 * the region reveals hidden (inert) chrome, except when a pointer press
 * caused it (a touch tap toggles instead), when the player moved focus back
 * from a control that hid, or when the window merely regained focus.
 */
export function useVibePlayerStageFocus(
  chrome: VibePlayerChromeState
): VibePlayerStageFocusEvents {
  const lastPointerDown = useRef(Number.NEGATIVE_INFINITY);
  const windowBlurTarget = useRef<EventTarget | null>(null);
  const onBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) {
        return;
      }
      // The window lost focus; the same element regains it on return.
      const leftWindow = next === null && !document.hasFocus();
      windowBlurTarget.current = leftWindow ? event.target : null;
      chrome.releaseChrome();
    },
    [chrome]
  );
  const onFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const windowReturn =
        event.relatedTarget === null &&
        event.target === windowBlurTarget.current;
      windowBlurTarget.current = null;
      const pointer =
        performance.now() - lastPointerDown.current < pointerFocusWindowMs;
      const control = event.target !== event.currentTarget;
      if (control && !(pointer && !matchesFocusVisible(event.target))) {
        chrome.holdChrome();
        return true;
      }
      // A removed control fires no blur; later focus must not stay pinned.
      chrome.releaseChrome();
      if (!(pointer || windowReturn || isInnerRefocus(event))) {
        chrome.showChrome();
      }
      return false;
    },
    [chrome]
  );
  const onPointerDownCapture = useCallback(() => {
    lastPointerDown.current = performance.now();
  }, []);
  return { onBlurCapture, onFocusCapture, onPointerDownCapture };
}
