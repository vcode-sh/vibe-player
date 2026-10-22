import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

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
  phase: "create" | "mount" | "load" | "playback";
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
  snapshot: VibePlayerSnapshot;
}

/** Controller construction options supplied by UI assemblies or hosts. */
export interface VibePlayerControllerOptions {
  adapterFactory: (source: VibePlayerSource) => VibePlayerAdapter;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  onError?: (error: VibePlayerError) => void;
  resumeStore?: VibePlayerResumeStore;
}
