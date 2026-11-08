import { type MouseEvent, type RefObject, useCallback } from "react";

/** The media element under a click, or null for controls and overlays. */
export function getVibePlayerClickedMedia(
  event: MouseEvent<HTMLElement>,
  rootElement: HTMLElement | null
): Element | null {
  const media = rootElement?.querySelector(".vibe-player-stage__media");
  return media && event.target instanceof Node && media.contains(event.target)
    ? media
    : null;
}

export function useVibePlayerStageClick({
  pointerType,
  rootElement,
  togglePlay,
}: {
  pointerType: RefObject<string>;
  rootElement: HTMLElement | null;
  togglePlay: () => void;
}) {
  return useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || pointerType.current === "touch") {
        return;
      }
      if (getVibePlayerClickedMedia(event, rootElement)) {
        togglePlay();
      }
    },
    [pointerType, rootElement, togglePlay]
  );
}
