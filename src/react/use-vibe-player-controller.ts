import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { VibePlayerController } from "../core/vibe-player-controller";
import { createInitialControllerState } from "../core/vibe-player-controller-state";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
} from "../core/vibe-player-types";

const serverState = createInitialControllerState();

function getServerState(): VibePlayerControllerState {
  return serverState;
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

  const subscribe = useCallback(
    (listener: () => void) => controller.subscribe(listener),
    [controller]
  );
  const getSnapshot = useCallback(() => controller.getState(), [controller]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerState);

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
