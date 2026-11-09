import type { VibePlayerError } from "./vibe-player-controller-types";
import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "./vibe-player-runtime-types";
import type { VibePlayerSource } from "./vibe-player-source-types";

/** Provider diagnostics and playback events include the source they belong to. */
export interface VibePlayerPlaybackEvent extends VibePlayerAdapterEvent {
  source: VibePlayerSource;
}

export interface VibePlayerRenewEvent {
  previousSource: VibePlayerSource;
  source: VibePlayerSource;
  type: "renew";
}

export interface VibePlayerIntegrationEvent {
  error: VibePlayerError;
  source: VibePlayerSource;
  type: "integrationerror";
}

/** A rejected optional command leaves playback available to the viewer. */
export interface VibePlayerCommandErrorEvent {
  command: string;
  error: VibePlayerError;
  source: VibePlayerSource;
  type: "commanderror";
}

export interface VibePlayerStopEvent {
  snapshot: VibePlayerSnapshot;
  source: VibePlayerSource;
  type: "stop";
}

/** Typed host telemetry; nonfatal diagnostics do not interrupt playback. */
export type VibePlayerEvent =
  | VibePlayerPlaybackEvent
  | VibePlayerRenewEvent
  | VibePlayerIntegrationEvent
  | VibePlayerCommandErrorEvent
  | VibePlayerStopEvent;

/** Every `type` the controller event stream can carry. */
export type VibePlayerEventType = VibePlayerEvent["type"];

/**
 * The event `controller.on(type, listener)` delivers: a playback event
 * narrowed to that `type`, the matching controller event, or every event
 * for `"*"`.
 */
export type VibePlayerEventOfType<K extends VibePlayerEventType | "*"> =
  K extends "*"
    ? VibePlayerEvent
    : K extends VibePlayerEventName
      ? VibePlayerPlaybackEvent & { type: K }
      : Extract<VibePlayerEvent, { type: K }>;
