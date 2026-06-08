import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { VibePlayerController } from "../core/vibe-player-controller";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
} from "../core/vibe-player-types";

function getServerState(): VibePlayerControllerState {
  return {
    capabilities: null,
    currentSource: null,
    isMounted: false,
    lastEvent: null,
    playbackBlocked: false,
    snapshot: {
      currentTime: 0,
      duration: 0,
      muted: false,
      paused: true,
      playbackRate: 1,
      readyState: "idle",
      volume: 1,
    },
  };
}

export function useVibePlayerController(options: VibePlayerControllerOptions) {
  const controller = useMemo(
    () => new VibePlayerController(options),
    [options]
  );

  useEffect(
    () => () => {
      controller.teardown().catch(() => undefined);
    },
    [controller]
  );

  const state = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
    getServerState
  );

  const setTarget = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        controller.mount(element).catch(() => undefined);
        return;
      }
      controller.unmount().catch(() => undefined);
    },
    [controller]
  );

  return { controller, setTarget, state };
}
