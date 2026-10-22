import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import type {
  VibePlayerController,
  VibePlayerControllerState,
  VibePlayerSource,
} from "../core";
import { createVibePlayerError } from "../core/vibe-player-errors";
import type { VibePlayerCaptionStatus } from "../react";
import type { VibePlayerPlaybackOptions } from "./vibe-player-stage-types";

interface StageObserversInput
  extends Pick<
    VibePlayerPlaybackOptions,
    "onCaptionStatusChange" | "onError" | "onStateChange"
  > {
  captionStatus: VibePlayerCaptionStatus;
  controller: VibePlayerController;
  source: VibePlayerSource;
  state: VibePlayerControllerState;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Optional host observers cannot interrupt the mounted playback surface. */
export function useVibePlayerStageObservers({
  captionStatus,
  controller,
  onCaptionStatusChange,
  onError,
  onStateChange,
  source,
  state,
}: StageObserversInput): void {
  const activeOwner = useRef<object | null>(null);
  useCommitEffect(() => {
    activeOwner.current = {};
    return () => {
      activeOwner.current = null;
    };
  }, [controller]);
  const reportFailure = useEffectEvent(
    (
      cause: unknown,
      operation: string,
      expectedSource: VibePlayerSource | null,
      expectedController: VibePlayerController,
      owner: object | null
    ) => {
      if (
        !owner ||
        owner !== activeOwner.current ||
        controller !== expectedController ||
        controller.getState().currentSource !== expectedSource
      ) {
        return;
      }
      try {
        Promise.resolve(
          onError?.(
            createVibePlayerError({
              cause,
              details: { operation },
              phase: "integration",
              source: expectedSource ?? source,
            })
          )
        ).catch(() => undefined);
      } catch {
        // A failing error reporter must not start a reporting loop.
      }
    }
  );
  const notify = useEffectEvent(
    (operation: string, callback: () => unknown) => {
      const expectedSource = controller.getState().currentSource;
      const owner = activeOwner.current;
      const report = (cause: unknown) =>
        reportFailure(cause, operation, expectedSource, controller, owner);
      try {
        Promise.resolve(callback()).catch(report);
      } catch (cause) {
        report(cause);
      }
    }
  );
  const notifyCaptions = useEffectEvent((status: VibePlayerCaptionStatus) =>
    notify("caption-status-observer", () => onCaptionStatusChange?.(status))
  );
  const notifyState = useEffectEvent((next: VibePlayerControllerState) =>
    notify("state-observer", () => onStateChange?.(next))
  );
  useEffect(() => notifyCaptions(captionStatus), [captionStatus]);
  useEffect(() => notifyState(state), [state]);
}
