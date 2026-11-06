import { type MouseEvent, type RefObject, useCallback } from "react";

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
      const mediaElement = rootElement?.querySelector(
        ".vibe-player-stage__media"
      );
      const mediaWasClicked =
        event.target instanceof Node && mediaElement?.contains(event.target);
      if (mediaWasClicked) {
        togglePlay();
      }
    },
    [pointerType, rootElement, togglePlay]
  );
}
