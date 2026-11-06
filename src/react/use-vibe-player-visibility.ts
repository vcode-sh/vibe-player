import { useEffect, useRef } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type {
  VibePlayerLoadMode,
  VibePlayerSource,
} from "../core/vibe-player-types";
import { startVibePlayerAutoplay } from "./vibe-player-autoplay";
import { observeVibePlayerIntersection } from "./vibe-player-shared-intersection";

/** Optional lifecycle policies for surfaces containing many players. */
export interface VibePlayerVisibilityOptions {
  /**
   * Start muted playback on the first visible entry per source. After a stop,
   * returning to view waits for Play. Disabled by default.
   */
  autoplayWhenVisible?: boolean | undefined;
  /** Minimum visible area, from 0 to 1. Defaults to 0.25. */
  offscreenThreshold?: number | undefined;
  /** Release playback when the document becomes hidden. Defaults to true. */
  pauseWhenHidden?: boolean | undefined;
  /** Release playback when the frame leaves view. Defaults to true. */
  stopWhenOffscreen?: boolean | undefined;
}

interface VisibilityOptions extends VibePlayerVisibilityOptions {
  controller: VibePlayerController;
  load: VibePlayerLoadMode;
  open: boolean;
  source: VibePlayerSource | null;
  target: HTMLElement | null;
}

interface VisibleAutoplaySession {
  controller: VibePlayerController;
  source: VibePlayerSource;
  started: boolean;
}

function releaseActivePlayer(controller: VibePlayerController): void {
  const { currentSource, snapshot } = controller.getState();
  if (currentSource && snapshot.readyState !== "idle") {
    controller.stop().catch(() => undefined);
  }
}

function getVisibilityThreshold(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.25;
}

function isPlaybackHidden(pauseWhenHidden: boolean): boolean {
  return pauseWhenHidden && document.visibilityState === "hidden";
}

export function useVibePlayerVisibility({
  autoplayWhenVisible = false,
  controller,
  load,
  offscreenThreshold = 0.25,
  open,
  pauseWhenHidden = true,
  source,
  stopWhenOffscreen = true,
  target,
}: VisibilityOptions): void {
  const autoplaySession = useRef<VisibleAutoplaySession | null>(null);
  useEffect(() => {
    if (!(open && pauseWhenHidden)) {
      return;
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        releaseActivePlayer(controller);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const unsubscribe = controller.subscribe(onVisibilityChange);
    onVisibilityChange();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
    };
  }, [controller, open, pauseWhenHidden]);

  useEffect(() => {
    if (
      !(open && target && source) ||
      typeof IntersectionObserver === "undefined" ||
      !(stopWhenOffscreen || load === "visible" || autoplayWhenVisible)
    ) {
      return;
    }
    if (
      autoplaySession.current?.controller !== controller ||
      autoplaySession.current.source !== source
    ) {
      autoplaySession.current = { controller, source, started: false };
    }
    const session = autoplaySession.current;
    const threshold = getVisibilityThreshold(offscreenThreshold);
    let current = true;
    let visible = false;
    const onVisible = () => {
      if (isPlaybackHidden(pauseWhenHidden)) {
        return;
      }
      if (autoplayWhenVisible) {
        if (session.started) {
          return;
        }
        session.started = true;
        startVibePlayerAutoplay({
          controller,
          isCancelled: () =>
            !(current && visible) || isPlaybackHidden(pauseWhenHidden),
          mutedBootstrap: true,
        }).catch(() => undefined);
        return;
      }
      if (load === "visible") {
        controller.activate().catch(() => undefined);
      }
    };
    const unobserve = observeVibePlayerIntersection(
      target,
      threshold,
      (entry) => {
        if (!current) {
          return;
        }
        visible =
          entry.isIntersecting &&
          entry.intersectionRatio > 0 &&
          entry.intersectionRatio >= threshold;
        if (!visible) {
          if (stopWhenOffscreen) {
            releaseActivePlayer(controller);
          }
          return;
        }
        onVisible();
      }
    );
    return () => {
      current = false;
      unobserve();
    };
  }, [
    autoplayWhenVisible,
    controller,
    load,
    offscreenThreshold,
    open,
    pauseWhenHidden,
    source,
    stopWhenOffscreen,
    target,
  ]);
}
