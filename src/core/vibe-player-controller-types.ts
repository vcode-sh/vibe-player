import type { VibePlayerEvent } from "./vibe-player-host-events";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** When a bound source is allowed to create and attach its playback engine. */
export type VibePlayerLoadMode = "onPlay" | "eager" | "visible";

/** Host-owned resume persistence adapter. */
export interface VibePlayerResumeStore {
  clear(sourceId: string): void;
  get(sourceId: string): number | null;
  set(sourceId: string, seconds: number): void;
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
  currentTime?: number;
  duration?: number;
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
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  onEnded?: (state: VibePlayerControllerState) => void;
  onError?: (error: VibePlayerError) => void;
  onEvent?: (event: VibePlayerEvent) => void;
  onPause?: (state: VibePlayerControllerState) => void;
  onPlay?: (state: VibePlayerControllerState) => void;
  onProgress?: (state: VibePlayerControllerState) => void;
  onQualityChange?: (state: VibePlayerControllerState) => void;
  onRenew?: (source: VibePlayerSource) => void;
  renewSource?: (() => Promise<VibePlayerSource>) | undefined;
  resumeStore?: VibePlayerResumeStore;
}
