import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerResumeStore,
} from "./vibe-player-controller-types";
import type { VibePlayerEventName } from "./vibe-player-runtime-types";

/** Runs host code isolated, returning `fallback` when it throws. */
export type VibePlayerHostRun = <T>(
  operation: string,
  execute: () => T,
  fallback?: T
) => T | undefined;

/** `onProgress` runs at most this often. */
const progressIntervalMs = 250;

/** The convenience callbacks that follow adapter events. */
export class VibePlayerHostCallbacks {
  private lastProgressAt = Number.NEGATIVE_INFINITY;
  private readonly options: VibePlayerControllerOptions;
  private readonly run: VibePlayerHostRun;

  constructor(options: VibePlayerControllerOptions, run: VibePlayerHostRun) {
    this.options = options;
    this.run = run;
  }

  /** A new session reports progress again right away. */
  reset(): void {
    this.lastProgressAt = Number.NEGATIVE_INFINITY;
  }

  /** Runs the callback for `type` with the state that event produced. */
  afterEvent(type: VibePlayerEventName, state: VibePlayerControllerState) {
    const { options } = this;
    if (type === "play") {
      this.run("onPlay", () => options.onPlay?.(state));
    } else if (type === "pause") {
      this.run("onPause", () => options.onPause?.(state));
    } else if (type === "ended") {
      this.run("onEnded", () => options.onEnded?.(state));
    } else if (type === "qualitychange") {
      this.run("onQualityChange", () => options.onQualityChange?.(state));
    } else if (
      type === "timeupdate" &&
      Date.now() - this.lastProgressAt >= progressIntervalMs
    ) {
      this.lastProgressAt = Date.now();
      this.run("onProgress", () => options.onProgress?.(state));
    }
  }
}

/** The host's resume store with every call isolated. */
export function wrapVibePlayerResumeStore(
  store: VibePlayerResumeStore | undefined,
  run: VibePlayerHostRun
): VibePlayerResumeStore | undefined {
  if (!store) {
    return;
  }
  return {
    clear: (sourceId) => run("resume-clear", () => store.clear(sourceId)),
    get: (sourceId) =>
      run("resume-get", () => store.get(sourceId), null) ?? null,
    set: (sourceId, seconds, context) =>
      run("resume-set", () => store.set(sourceId, seconds, context)),
  };
}
