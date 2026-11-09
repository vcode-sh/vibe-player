import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  VibePlayerController,
  VibePlayerLoadMode,
  VibePlayerSource,
} from "../core";
import { haveEqualVibePlayerSources } from "../core/vibe-player-source-equality";
import {
  getVibePlayerAudioFocusGroup,
  useVibePlayerAudibleFocus,
  type VibePlayerAudioFocusSetting,
} from "./use-vibe-player-audible-focus";
import {
  type UseVibePlayerControllerOptions,
  useVibePlayerController,
} from "./use-vibe-player-controller";
import {
  type UseVibePlayerMediaSessionOptions,
  useVibePlayerMediaSession,
} from "./use-vibe-player-media-session";
import {
  useVibePlayerVisibility,
  type VibePlayerVisibilityOptions,
} from "./use-vibe-player-visibility";
import { startVibePlayerAutoplay } from "./vibe-player-autoplay";

/** Headless playback with package-owned mounting, source changes and autoplay. */
export interface UseVibePlayerOptions
  extends UseVibePlayerControllerOptions,
    VibePlayerVisibilityOptions {
  /**
   * One audible player per group: a group name, `{ group, onLose }`, or
   * `false` to let the host coordinate. Default group `"default"`; a player
   * that loses focus pauses unless `onLose` is `"stop"`.
   */
  audioFocus?: VibePlayerAudioFocusSetting;
  autoPlay?: boolean | undefined;
  autoPlayMutedBootstrap?: boolean | undefined;
  /** The bare hook retains eager loading; inline assemblies default to onPlay. */
  load?: VibePlayerLoadMode | undefined;
  /**
   * Opt-in system media controls (lock screen, notifications, media keys)
   * through `navigator.mediaSession`. `true` uses the source title and poster.
   */
  mediaSession?: boolean | UseVibePlayerMediaSessionOptions | undefined;
  open?: boolean | undefined;
  /** Fullscreen container; defaults to the bound media target. */
  presentationTarget?: HTMLElement | null | undefined;
  /**
   * Seconds one skip moves: skip buttons, arrow keys and J/L, double-tap seek
   * and the Media Session seek defaults (a system offset still wins). Any
   * positive number; 10 (default), 15 and 30 are the common choices.
   */
  seekStep?: number | undefined;
  source: VibePlayerSource | null;
}

interface LoadedSource {
  controller: VibePlayerController;
  generation: number;
  source: VibePlayerSource;
}

const useMountEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function useStableSource(source: VibePlayerSource | null) {
  const [current, setCurrent] = useState(source);
  if (!haveEqualVibePlayerSources(current, source)) {
    setCurrent(source);
    return source;
  }
  return current;
}

export function useVibePlayer({
  audioFocus = "default",
  autoPlay = false,
  autoPlayMutedBootstrap = true,
  autoplayWhenVisible = false,
  load = "eager",
  mediaSession,
  offscreenThreshold,
  open = true,
  pauseWhenHidden = true,
  presentationTarget,
  seekStep,
  source: nextSource,
  stopWhenOffscreen = true,
  ...options
}: UseVibePlayerOptions) {
  const source = useStableSource(nextSource);
  const binding = useVibePlayerController(options);
  const { controller, state } = binding;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedSource | null>(null);
  const loadGeneration = useRef(0);

  useVibePlayerAudibleFocus({
    controller,
    focus: audioFocus,
    mediaSession: Boolean(mediaSession),
    state,
  });
  useVibePlayerMediaSession(controller, mediaSession, {
    focusGroup: getVibePlayerAudioFocusGroup(audioFocus),
    seekStep,
  });
  useVibePlayerVisibility({
    autoplayWhenVisible,
    controller,
    load,
    offscreenThreshold,
    open,
    pauseWhenHidden,
    source,
    stopWhenOffscreen,
    target: presentationTarget ?? target,
  });

  useMountEffect(() => {
    if (!target) {
      return;
    }
    return () => {
      controller.unmount().catch(() => undefined);
    };
  }, [controller, target]);

  useMountEffect(() => {
    if (target) {
      controller
        .mount(target, presentationTarget ?? target)
        .catch(() => undefined);
    }
  }, [controller, presentationTarget, target]);

  useMountEffect(() => {
    loadGeneration.current += 1;
    const generation = loadGeneration.current;
    let cancelled = false;
    if (!(open && source)) {
      controller
        .closeSource()
        .then(() => {
          if (!(target || cancelled)) {
            return controller.unmount();
          }
        })
        .catch(() => undefined);
    } else if (target) {
      const mode =
        pauseWhenHidden && document.visibilityState === "hidden"
          ? "onPlay"
          : load;
      controller
        .load(source, mode)
        .then(() => {
          if (!cancelled) {
            setLoaded({ controller, generation, source });
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      loadGeneration.current += 1;
    };
  }, [controller, load, open, pauseWhenHidden, source, target]);

  useEffect(() => {
    if (
      !(autoPlay && open && target && state.isMounted) ||
      loaded?.controller !== controller ||
      loaded.source !== source ||
      loaded.generation !== loadGeneration.current ||
      (pauseWhenHidden && document.visibilityState === "hidden")
    ) {
      return;
    }
    let cancelled = false;
    startVibePlayerAutoplay({
      controller,
      isCancelled: () =>
        cancelled ||
        loaded.generation !== loadGeneration.current ||
        (pauseWhenHidden && document.visibilityState === "hidden"),
      mutedBootstrap: autoPlayMutedBootstrap,
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    autoPlay,
    autoPlayMutedBootstrap,
    controller,
    loaded,
    open,
    pauseWhenHidden,
    source,
    state.isMounted,
    target,
  ]);

  return { ...binding, setTarget };
}
