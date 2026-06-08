import { useEffect, useState } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";

export function useVibePlayerMediaTarget(controller: VibePlayerController) {
  const [mediaElement, setMediaElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mediaElement) {
      return;
    }
    controller.mount(mediaElement).catch(() => undefined);
  });

  useEffect(
    () => () => {
      controller.unmount().catch(() => undefined);
    },
    [controller]
  );

  return {
    hasMediaTarget: Boolean(mediaElement),
    setMediaElement,
  };
}
