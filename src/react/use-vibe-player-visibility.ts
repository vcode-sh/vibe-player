import { useEffect, useRef } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type {
  VibePlayerLoadMode,
  VibePlayerSource,
} from "../core/vibe-player-types";
import { startVibePlayerAutoplay } from "./vibe-player-autoplay";
import {
  isVibePlayerParked,
  onVibePlayerUnparked,
} from "./vibe-player-parking";
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

/** Picture-in-Picture is the viewer's choice to keep watching elsewhere. */
function releaseActivePlayer(controller: VibePlayerController): void {
  const { currentSource, snapshot } = controller.getState();
  if (
    currentSource &&
    snapshot.readyState !== "idle" &&
    !snapshot.isPictureInPicture
  ) {
    controller.stop().catch(() => undefined);
  }
}

/**
 * Reports whether `target` is visible. A detached player parked by its host
 * frame is undecided (`null`), never offscreen, so parking does not stop
 * it; once a host shows it again, observation restarts with a fresh entry.
 */
function observeVisibility(
  target: HTMLElement,
  threshold: number,
  onChange: (visible: boolean | null) => void
): () => void {
  let unobserve: () => void = () => undefined;
  let unwatch: (() => void) | null = null;
  const onUnparked = () => {
    if (!isVibePlayerParked(target)) {
      unwatch?.();
      unwatch = null;
      observe();
    }
  };
  const observe = () => {
    unobserve();
    unobserve = observeVibePlayerIntersection(target, threshold, (entry) => {
      const visible =
        entry.isIntersecting &&
        entry.intersectionRatio > 0 &&
        entry.intersectionRatio >= threshold;
      if (!visible && isVibePlayerParked(target)) {
        unwatch ??= onVibePlayerUnparked(onUnparked);
        onChange(null);
        return;
      }
      onChange(visible);
    });
  };
  observe();
  return () => {
    unobserve();
    unwatch?.();
  };
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
    // Unknown until the first entry, so a state change cannot release early.
    let visible: boolean | null = null;
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
    const unobserve = observeVisibility(target, threshold, (next) => {
      if (!current) {
        return;
      }
      visible = next;
      if (next === false && stopWhenOffscreen) {
        releaseActivePlayer(controller);
      } else if (next) {
        onVisible();
      }
    });
    // Leaving Picture-in-Picture while offscreen applies the deferred release.
    const unsubscribe = stopWhenOffscreen
      ? controller.subscribe(() => {
          if (current && visible === false) {
            releaseActivePlayer(controller);
          }
        })
      : undefined;
    return () => {
      current = false;
      unobserve();
      unsubscribe?.();
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
