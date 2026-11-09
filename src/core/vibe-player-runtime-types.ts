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
  isLive: boolean;
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
  videoHeight?: number;
  videoWidth?: number;
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
  | "playing"
  | "playblocked"
  | "qualitychange"
  | "ratechange"
  | "ready"
  | "seeked"
  | "seeking"
  | "timeupdate"
  | "volumechange";

/** Event emitted by adapters whenever normalized playback state changes. */
export interface VibePlayerAdapterEvent {
  /**
   * Optional event details. On an `error` event, `kind` (`"network"`, `"decode"`
   * or `"source"`) becomes `error.kind`; without it the error is `"unknown"`.
   * `fatal: false` marks a recoverable error: the controller reports it but
   * does not fail playback or renew the source. `concealedStatus: true` marks
   * media that fetched the URL itself and hid its HTTP status, as the file
   * adapter's element does; with it, a `"source"` error at `mediaReadyState`
   * `0` (the element's numeric `readyState`: nothing loaded) triggers a source
   * renewal, because an expired URL fails exactly like that. `message`
   * becomes the error message. `internal: true` on `seeking`/`seeked` marks a
   * seek the provider made itself (for example hls.js skipping a buffer gap,
   * nudging a stall or catching up to the live edge), and on another event
   * (such as the nonfatal diagnostic hls.js raises) that it just jumped: the
   * controller sends no analytics `seek`, saves no resume position for it,
   * keeps the watched batch and never counts the skipped stretch as watched.
   */
  payload?: Record<string, string | number | boolean | null | undefined>;
  snapshot: VibePlayerSnapshot;
  type: VibePlayerEventName;
}

/** Provider bridge contract implemented by file and HLS adapters. */
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
