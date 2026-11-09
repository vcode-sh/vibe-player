import { createVibePlayerPlaybackId } from "./vibe-player-playback-id";
import type { VibePlayerAdapterEvent } from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/**
 * Why a playback began: the host loaded a source (`load`), the playing
 * source id changed without a load (`source`), or media played again after
 * it ended (`replay`).
 */
export type VibePlayerPlaybackCause = "load" | "replay" | "source";

/** One viewing of one source; watched-range reports count within it. */
export interface VibePlayerPlayback {
  cause: VibePlayerPlaybackCause;
  /** Unique within the page. */
  id: string;
  source: VibePlayerSource;
}

/**
 * The single definition of a playback. A new one begins when the host loads
 * a source (even the same one again), when the playing source id changes,
 * and when media plays again after it ended. Retry, renewal, stop, pause,
 * seeking and remounting keep the current playback. Each start reaches
 * `begin` before later provider activity is observed.
 */
export class VibePlayerPlaybackLifecycle {
  private current: VibePlayerPlayback | null = null;
  private ended = false;
  private readonly begin: (playback: VibePlayerPlayback) => void;

  constructor(begin: (playback: VibePlayerPlayback) => void) {
    this.begin = begin;
  }

  /** The current playback, or null before the first load. */
  get playback(): VibePlayerPlayback | null {
    return this.current;
  }

  /** The host loads `source`: a new playback, whatever played before. */
  load(source: VibePlayerSource): void {
    this.start(source, "load");
  }

  /** Sees each provider event before raw-feed consumers do. */
  observe(
    source: VibePlayerSource,
    { snapshot, type }: VibePlayerAdapterEvent
  ): void {
    if (source.id !== this.current?.source.id) {
      this.start(source, "source");
    } else if (
      this.ended &&
      (type === "play" || type === "playing") &&
      !snapshot.paused
    ) {
      this.start(source, "replay");
    }
    if (type === "ended") {
      this.ended = true;
    }
  }

  private start(
    source: VibePlayerSource,
    cause: VibePlayerPlaybackCause
  ): void {
    this.ended = false;
    this.current = { cause, id: createVibePlayerPlaybackId(), source };
    this.begin(this.current);
  }
}
