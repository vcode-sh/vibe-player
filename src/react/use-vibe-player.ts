import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VibePlayerController, VibePlayerSource } from "../core";
import { haveEqualVibePlayerSources } from "../core/vibe-player-source-equality";
import {
  type UseVibePlayerControllerOptions,
  useVibePlayerController,
} from "./use-vibe-player-controller";
import { startVibePlayerAutoplay } from "./vibe-player-autoplay";

/** Headless playback with package-owned mounting, source changes and autoplay. */
export interface UseVibePlayerOptions extends UseVibePlayerControllerOptions {
  autoPlay?: boolean | undefined;
  autoPlayMutedBootstrap?: boolean | undefined;
  open?: boolean | undefined;
  /** Fullscreen container; defaults to the bound media target. */
  presentationTarget?: HTMLElement | null | undefined;
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
  autoPlay = false,
  autoPlayMutedBootstrap = true,
  open = true,
  presentationTarget,
  source: nextSource,
  ...options
}: UseVibePlayerOptions) {
  const source = useStableSource(nextSource);
  const binding = useVibePlayerController(options);
  const { controller, state } = binding;
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedSource | null>(null);
  const loadGeneration = useRef(0);

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
      controller
        .load(source)
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
  }, [controller, open, source, target]);

  useEffect(() => {
    if (
      !(autoPlay && open && target && state.isMounted) ||
      loaded?.controller !== controller ||
      loaded.source !== source ||
      loaded.generation !== loadGeneration.current
    ) {
      return;
    }
    let cancelled = false;
    startVibePlayerAutoplay({
      controller,
      isCancelled: () =>
        cancelled || loaded.generation !== loadGeneration.current,
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
    source,
    state.isMounted,
    target,
  ]);

  return { ...binding, setTarget };
}
