import type { VibePlayerEvent } from "./vibe-player-host-events";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";
import type { VibePlayerWatchedRangesReport } from "./vibe-player-watched-ranges";

/** When a bound source is allowed to create and attach its playback engine. */
export type VibePlayerLoadMode = "onPlay" | "eager" | "visible";

/** What the controller knows when it saves a resume position. */
export interface VibePlayerResumeContext {
  /** Media duration in seconds when known, else 0. */
  duration: number;
  /**
   * Why it saves: `progress` while playing (at most once per 2 seconds of
   * movement), `seek` once a seek settled, `pause` on pause or stop,
   * `hidden` when the page is hidden, `close` when the source closes,
   * changes or unmounts.
   */
  reason: "close" | "hidden" | "pause" | "progress" | "seek";
}

/**
 * Host-owned resume persistence. Every player writes its own position, so
 * players or tabs sharing a source id overwrite each other: the last write
 * wins.
 */
export interface VibePlayerResumeStore {
  clear(sourceId: string): void;
  get(sourceId: string): number | null;
  /**
   * Saves `seconds` for `sourceId`. The controller always passes `context`;
   * it is optional so stores written for earlier versions still type-check.
   */
  set(
    sourceId: string,
    seconds: number,
    context?: VibePlayerResumeContext
  ): void;
}

/** Normalized analytics event names emitted by the package controller. */
export type VibePlayerAnalyticsEventName =
  | "closed"
  | "completed"
  | "error"
  | "opened"
  | "progress_25"
  | "progress_50"
  | "progress_75"
  | "seek"
  | "started";

/** Package analytics payload for host-owned telemetry sinks. */
export interface VibePlayerAnalyticsEvent {
  /** Media position in seconds; for `seek`, the position the seek went to. */
  currentTime?: number;
  duration?: number;
  /** Set on every `seek`: the position in seconds the seek left. */
  from?: number;
  /**
   * Set on every `seek`: `controller` for `seekTo()` (package controls,
   * shortcuts, Media Session or host code), `media` for a seek the media
   * started itself (native controls, Picture-in-Picture, the browser).
   */
  initiator?: "controller" | "media";
  provider: VibePlayerSource["type"];
  sourceId: string;
  type: VibePlayerAnalyticsEventName;
}

/** Normalized failure with its original cause or provider diagnostics intact. */
export interface VibePlayerError {
  cause?: unknown;
  details?: Readonly<VibePlayerAdapterEvent["payload"]>;
  message: string;
  phase: "create" | "mount" | "load" | "playback" | "integration";
  provider: VibePlayerSource["type"];
  sourceId: string;
}

/** Observable controller state consumed by React bindings and UI. */
export interface VibePlayerControllerState {
  capabilities: VibePlayerCapabilities | null;
  currentSource: VibePlayerSource | null;
  error: VibePlayerError | null;
  isMounted: boolean;
  /**
   * The event behind the latest state change, after pending command intent
   * (a pending pause reports `pause`). Latest event only; use
   * `controller.on()` or `onEvent` for a lossless stream.
   */
  lastEvent: VibePlayerEventName | null;
  playbackBlocked: boolean;
  /** An expired or failed media delivery is being renewed and reattached. */
  renewing: boolean;
  snapshot: VibePlayerSnapshot;
}

/** Controller construction options supplied by UI assemblies or hosts. */
export interface VibePlayerControllerOptions {
  adapterFactory: (
    source: VibePlayerSource
  ) => VibePlayerAdapter | Promise<VibePlayerAdapter>;
  /**
   * Normalized analytics. `opened`/`closed` bracket a source's session, kept
   * across retry and renewal; `started`, milestones (by watched coverage)
   * and `completed` fire once per playback.
   */
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  onEnded?: (state: VibePlayerControllerState) => void;
  onError?: (error: VibePlayerError) => void;
  /** Every controller event in order; `controller.on()` filters the same stream. */
  onEvent?: (event: VibePlayerEvent) => void;
  onPause?: (state: VibePlayerControllerState) => void;
  onPlay?: (state: VibePlayerControllerState) => void;
  onProgress?: (state: VibePlayerControllerState) => void;
  onQualityChange?: (state: VibePlayerControllerState) => void;
  onRenew?: (source: VibePlayerSource) => void;
  /**
   * Opt-in: merged media ranges that actually played since the last report,
   * delivered on pause, end, seek, reload, close, page hide or
   * `flushWatchedRanges()`, numbered by `sequence` within a `playbackId`.
   * Seeks and scrubbing never count. The host owns delivery and storage.
   */
  onWatchedRanges?: (report: VibePlayerWatchedRangesReport) => void;
  renewSource?: (() => Promise<VibePlayerSource>) | undefined;
  /** Opt-in resume persistence; see `VibePlayerResumeContext` for when it saves. */
  resumeStore?: VibePlayerResumeStore;
}
