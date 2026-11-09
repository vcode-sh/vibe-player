import { VibePlayerOrderedDelivery } from "./vibe-player-ordered-delivery";
import type { VibePlayerPlayback } from "./vibe-player-playback";
import type {
  VibePlayerAdapterEvent,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/**
 * Why the controller stopped listening to its adapter: the source closed or
 * changed, the media unmounted or the controller tore down (`close`);
 * playback stopped and keeps its source and position (`stop`); or the same
 * source attaches a fresh adapter, as on renewal or retry (`reload`). A host
 * load of the same source also reloads, after its `playback` entry.
 */
export type VibePlayerRawReleaseReason = "close" | "reload" | "stop";

/** One adapter event exactly as the provider reported it. */
export interface VibePlayerRawEventEntry {
  /** Never rewritten by pending command intent, unlike `state.lastEvent`. */
  event: VibePlayerAdapterEvent;
  kind: "event";
  /** The source the reporting adapter plays. */
  source: VibePlayerSource;
}

/**
 * The adapter acknowledged a controller command; `snapshot` is the adapter's
 * own state at that moment, not the controller's intent.
 */
export interface VibePlayerRawCommandEntry {
  command: "pause";
  kind: "command";
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
}

/**
 * The controller is about to seek the adapter: a `seekTo()` call
 * (`controller`) or a resume, recovery or replay position it restores
 * (`restore`). `snapshot` is the adapter's own state before the seek.
 */
export interface VibePlayerRawSeekEntry {
  initiator: "controller" | "restore";
  kind: "seek";
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
  /** The accepted target position, in seconds. */
  target: number;
}

/** The adapter rejected an announced seek, so it never went to `target`. */
export interface VibePlayerRawSeekFailedEntry {
  kind: "seekfailed";
  source: VibePlayerSource;
  target: number;
}

/** A new playback began; entries after it belong to `playback`. */
export interface VibePlayerRawPlaybackEntry {
  kind: "playback";
  playback: VibePlayerPlayback;
}

/** The controller released its adapter; its later events are ignored. */
export interface VibePlayerRawReleaseEntry {
  kind: "release";
  reason: VibePlayerRawReleaseReason;
}

export type VibePlayerRawFeedEntry =
  | VibePlayerRawCommandEntry
  | VibePlayerRawEventEntry
  | VibePlayerRawPlaybackEntry
  | VibePlayerRawReleaseEntry
  | VibePlayerRawSeekEntry
  | VibePlayerRawSeekFailedEntry;

type RawFeedConsumer = (entry: VibePlayerRawFeedEntry) => void;

/** Attaching the same source id again is a reload; another id closes it. */
export function getVibePlayerReleaseReason(
  current: VibePlayerSource | null,
  next: VibePlayerSource
): VibePlayerRawReleaseReason {
  return current?.id === next.id ? "reload" : "close";
}

/**
 * Internal, ordered feed of provider activity for controller-owned trackers.
 * Consumers see every adapter event of the current adapter, acknowledged
 * commands, announced and failed seeks, playback starts and every release,
 * in order, before controller state applies pending command intent.
 */
export class VibePlayerRawFeed {
  private readonly consumers = new Set<RawFeedConsumer>();
  private readonly delivery =
    new VibePlayerOrderedDelivery<VibePlayerRawFeedEntry>((entry) => {
      for (const consumer of this.consumers) {
        consumer(entry);
      }
    });

  subscribe(consumer: RawFeedConsumer): () => void {
    this.consumers.add(consumer);
    return () => this.consumers.delete(consumer);
  }

  command(
    command: VibePlayerRawCommandEntry["command"],
    snapshot: VibePlayerSnapshot,
    source: VibePlayerSource
  ): void {
    this.delivery.publish({ command, kind: "command", snapshot, source });
  }

  event(event: VibePlayerAdapterEvent, source: VibePlayerSource): void {
    this.delivery.publish({ event, kind: "event", source });
  }

  playback(playback: VibePlayerPlayback): void {
    this.delivery.publish({ kind: "playback", playback });
  }

  release(reason: VibePlayerRawReleaseReason): void {
    this.delivery.publish({ kind: "release", reason });
  }

  seek(seek: Omit<VibePlayerRawSeekEntry, "kind">): void {
    this.delivery.publish({ ...seek, kind: "seek" });
  }

  seekFailed(target: number, source: VibePlayerSource): void {
    this.delivery.publish({ kind: "seekfailed", source, target });
  }
}
