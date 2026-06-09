import type {
  VibePlayerAdapter,
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

/** Observable controller state consumed by React bindings and UI. */
export interface VibePlayerControllerState {
  capabilities: VibePlayerCapabilities | null;
  currentSource: VibePlayerSource | null;
  isMounted: boolean;
  lastEvent: VibePlayerEventName | null;
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

/** Controller construction options supplied by UI assemblies or hosts. */
export interface VibePlayerControllerOptions {
  adapterFactory: (source: VibePlayerSource) => VibePlayerAdapter;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  resumeStore?: VibePlayerResumeStore;
}
