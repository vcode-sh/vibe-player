import type { VibePlayerSource } from "./vibe-player-source-types";

/** Selectable HLS quality option exposed by managed HLS playback. */
export interface VibePlayerQualityOption {
  auto: boolean;
  bitrate?: number;
  height?: number;
  id: string;
  label: string;
  selected: boolean;
}

/** Adapter capability flags used to keep controls honest per provider. */
export interface VibePlayerCapabilities {
  canFullscreen: boolean;
  canPictureInPicture: boolean;
  canSeek: boolean;
  canSetPlaybackRate: boolean;
  canShowCaptions: boolean;
  hasNativeCaptionsMenu: boolean;
  isLive: boolean;
  /** Keep host controls visible when the provider owns interactive media UI. */
  keepsControlsVisible?: boolean;
  supportsDuration: boolean;
  supportsMute: boolean;
  supportsPlayback: boolean;
  supportsPoster: boolean;
  supportsQualitySelection: boolean;
  supportsVolumeControl: boolean;
}

/** Normalized playback state snapshot emitted by every adapter. */
export interface VibePlayerSnapshot {
  bufferedPct?: number;
  currentTime: number;
  duration: number;
  isFullscreen?: boolean;
  isPictureInPicture?: boolean;
  muted: boolean;
  paused: boolean;
  playbackRate: number;
  /** Provider-supported rate choices; omitted adapters use package defaults. */
  playbackRates?: readonly number[];
  qualityOptions?: VibePlayerQualityOption[];
  readyState:
    | "buffering"
    | "ended"
    | "error"
    | "idle"
    | "loading"
    | "playing"
    | "ready";
  volume: number;
}

/** Normalized low-level adapter event names. */
export type VibePlayerEventName =
  | "buffering"
  | "captionschange"
  | "durationchange"
  | "ended"
  | "error"
  | "fullscreenchange"
  | "pictureinpicturechange"
  | "pause"
  | "play"
  | "playblocked"
  | "qualitychange"
  | "ratechange"
  | "ready"
  | "timeupdate"
  | "volumechange";

/** Event emitted by adapters whenever normalized playback state changes. */
export interface VibePlayerAdapterEvent {
  payload?: Record<string, string | number | boolean | null | undefined>;
  snapshot: VibePlayerSnapshot;
  type: VibePlayerEventName;
}

/** Provider bridge contract implemented by file, HLS, and YouTube adapters. */
export interface VibePlayerAdapter {
  readonly capabilities: VibePlayerCapabilities;
  enterFullscreen?(): Promise<void>;
  enterPictureInPicture?(): Promise<void>;
  exitFullscreen?(): Promise<void>;
  exitPictureInPicture?(): Promise<void>;
  getSnapshot(): VibePlayerSnapshot;
  readonly kind: VibePlayerSource["type"];
  load(source: VibePlayerSource): Promise<void>;
  mount(target: HTMLElement, presentationTarget?: HTMLElement): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  /** Acknowledges the seek request; provider events/snapshots report subsequent playback position. */
  seekTo(seconds: number): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setPlaybackRate(value: number): Promise<void>;
  setQuality?(qualityId: string): Promise<void>;
  setVolume(value: number): Promise<void>;
  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void;
  unmount(): Promise<void>;
}
