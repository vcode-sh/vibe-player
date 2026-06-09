import { type FocusEvent, type KeyboardEvent, useCallback } from "react";
import { shouldRevealVibePlayerChromeForKey } from "../core";
import type { VibePlayerChromeState } from "../react";
import { useVibePlayerStageClick } from "./use-vibe-player-stage-click";

export interface UseVibePlayerStageRootEventsInput {
  chrome: VibePlayerChromeState;
  rootElement: HTMLDivElement | null;
  togglePlay: () => void;
}

export interface VibePlayerStageRootEvents {
  onBlurCapture: (event: FocusEvent<HTMLDivElement>) => void;
  onClick: ReturnType<typeof useVibePlayerStageClick>;
  onFocusCapture: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: () => void;
  onPointerMove: () => void;
}

export function useVibePlayerStageRootEvents({
  chrome,
  rootElement,
  togglePlay,
}: UseVibePlayerStageRootEventsInput): VibePlayerStageRootEvents {
  const onClick = useVibePlayerStageClick({ rootElement, togglePlay });
  const onBlurCapture = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
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
    (event: FocusEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        chrome.showChrome();
        return;
      }
      chrome.holdChrome();
    },
    [chrome]
  );
  const onKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        shouldRevealVibePlayerChromeForKey({
          chromeHidden: chrome.chromeHidden,
          key: event.key,
        })
      ) {
        chrome.showChrome();
      }
    },
    [chrome]
  );
  return {
    onBlurCapture,
    onClick,
    onFocusCapture,
    onKeyDownCapture,
    onPointerDown: chrome.showChrome,
    onPointerMove: chrome.showChrome,
  };
}
