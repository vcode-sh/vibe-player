import { type MouseEvent, useCallback } from "react";

export function useVibePlayerStageClick({
  rootElement,
  togglePlay,
}: {
  rootElement: HTMLDivElement | null;
  togglePlay: () => void;
}) {
  return useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) {
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
    [rootElement, togglePlay]
  );
}
