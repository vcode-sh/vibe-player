import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createVibePlayerAdapter } from "../adapters";
import { VibePlayerController } from "../core/vibe-player-controller";
import { createInitialControllerState } from "../core/vibe-player-controller-state";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
} from "../core/vibe-player-types";

/** Controller infrastructure is stable until its factory or resume store changes. */
export interface UseVibePlayerControllerOptions
  extends Omit<
    VibePlayerControllerOptions,
    "adapterFactory" | "onAnalyticsEvent" | "onError" | "resumeStore"
  > {
  adapterFactory?: VibePlayerControllerOptions["adapterFactory"] | undefined;
  onAnalyticsEvent?:
    | VibePlayerControllerOptions["onAnalyticsEvent"]
    | undefined;
  onError?: VibePlayerControllerOptions["onError"] | undefined;
  resumeStore?: VibePlayerControllerOptions["resumeStore"] | undefined;
}

const serverState = createInitialControllerState();
const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function getServerState(): VibePlayerControllerState {
  return serverState;
}

/** Low-level binding; use `useVibePlayer` for package-managed source lifecycle. */
export function useVibePlayerController(
  options: UseVibePlayerControllerOptions = {}
) {
  const { adapterFactory = createVibePlayerAdapter, resumeStore } = options;
  const callbacks = useRef(options);
  useCommitEffect(() => {
    callbacks.current = options;
  });
  const controller = useMemo(
    () =>
      new VibePlayerController({
        adapterFactory,
        onAnalyticsEvent: (event) =>
          callbacks.current.onAnalyticsEvent?.(event),
        onError: (error) => callbacks.current.onError?.(error),
        ...(resumeStore ? { resumeStore } : {}),
      }),
    [adapterFactory, resumeStore]
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
      const operation = element
        ? controller.mount(element)
        : controller.unmount();
      operation.catch(() => undefined);
    },
    [controller]
  );

  return { controller, setTarget, state };
}
