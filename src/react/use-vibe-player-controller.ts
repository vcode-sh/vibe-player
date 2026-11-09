import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { VibePlayerAdapterOptions } from "../adapters/create-vibe-player-adapter";
import { VibePlayerController } from "../core/vibe-player-controller";
import { onVibePlayerControllerRetire } from "../core/vibe-player-controller-retirement";
import { createInitialControllerState } from "../core/vibe-player-controller-state";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
} from "../core/vibe-player-types";
import { useVibePlayerAdapterFactory } from "./use-vibe-player-adapter-factory";

/** Controller infrastructure is stable until its factory or resume store changes. */
export interface UseVibePlayerControllerOptions
  extends VibePlayerAdapterOptions,
    Omit<
      VibePlayerControllerOptions,
      | "adapterFactory"
      | "onAnalyticsEvent"
      | "onEnded"
      | "onError"
      | "onEvent"
      | "onPause"
      | "onPlay"
      | "onProgress"
      | "onQualityChange"
      | "onRenew"
      | "onWatchedRanges"
      | "renewSource"
      | "resumeStore"
    > {
  adapterFactory?: VibePlayerControllerOptions["adapterFactory"] | undefined;
  onAnalyticsEvent?:
    | VibePlayerControllerOptions["onAnalyticsEvent"]
    | undefined;
  onEnded?: VibePlayerControllerOptions["onEnded"] | undefined;
  onError?: VibePlayerControllerOptions["onError"] | undefined;
  onEvent?: VibePlayerControllerOptions["onEvent"] | undefined;
  onPause?: VibePlayerControllerOptions["onPause"] | undefined;
  onPlay?: VibePlayerControllerOptions["onPlay"] | undefined;
  onProgress?: VibePlayerControllerOptions["onProgress"] | undefined;
  onQualityChange?: VibePlayerControllerOptions["onQualityChange"] | undefined;
  onRenew?: VibePlayerControllerOptions["onRenew"] | undefined;
  onWatchedRanges?: VibePlayerControllerOptions["onWatchedRanges"] | undefined;
  renewSource?: VibePlayerControllerOptions["renewSource"] | undefined;
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
  const adapterFactory = useVibePlayerAdapterFactory(options);
  const { resumeStore } = options;
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
        onEnded: (nextState) => callbacks.current.onEnded?.(nextState),
        onError: (error) => callbacks.current.onError?.(error),
        onEvent: (event) => callbacks.current.onEvent?.(event),
        onPause: (nextState) => callbacks.current.onPause?.(nextState),
        onPlay: (nextState) => callbacks.current.onPlay?.(nextState),
        onProgress: (nextState) => callbacks.current.onProgress?.(nextState),
        onQualityChange: (nextState) =>
          callbacks.current.onQualityChange?.(nextState),
        onRenew: (source) => callbacks.current.onRenew?.(source),
        onWatchedRanges: (report) =>
          callbacks.current.onWatchedRanges?.(report),
        get renewSource() {
          return callbacks.current.renewSource;
        },
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

  // A hidden page may never come back; deliver watched ranges while it can.
  useEffect(() => {
    const flush = () => controller.flushWatchedRanges("hidden");
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [controller]);

  // Retiring silences subscribers; the binding still renders the idle state once.
  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribe = controller.subscribe(listener);
      const unwatch = onVibePlayerControllerRetire(controller, listener);
      return () => {
        unsubscribe();
        unwatch();
      };
    },
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
