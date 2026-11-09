import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
} from "react";
import { flushSync } from "react-dom";
import { shouldRevealVibePlayerChromeForKey } from "../core";
import type { VibePlayerChromeState } from "../react";
import { useVibePlayerStageClick } from "./use-vibe-player-stage-click";
import {
  useVibePlayerStageFocus,
  type VibePlayerStageFocusEvents,
} from "./use-vibe-player-stage-focus";

export interface UseVibePlayerStageRootEventsInput {
  chrome: VibePlayerChromeState;
  /** Compact surfaces clear the video as soon as a mouse leaves. */
  hideOnPointerLeave: boolean;
  /** The last pointer's type; touch clicks never toggle playback. */
  pointerType: RefObject<string>;
  rootElement: HTMLElement | null;
  togglePlay: () => void;
}

export interface VibePlayerStageRootEvents extends VibePlayerStageFocusEvents {
  onClick: ReturnType<typeof useVibePlayerStageClick>;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
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
  const focus = useVibePlayerStageFocus(chrome);
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
    ...focus,
    onClick,
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
