/** Caption or subtitle track consumed by the custom package caption overlay. */
export interface VibePlayerCaptionTrack {
  default?: boolean;
  id: string;
  kind: "captions" | "subtitles";
  label: string;
  language: string;
  url: string;
}

/** Single browser-playable media URL for direct file playback. */
export interface VibePlayerMediaSource {
  mimeType: string;
  url: string;
}

/** Direct MP4/WebM source rendered through the native file adapter. */
export interface VibePlayerFileSource {
  /**
   * Mirrors the native video `autoplay` attribute for file sources. Most hosts
   * should control startup with `VibePlayerStage autoPlay`; this flag exists
   * for native-video parity when a user gesture opens the player surface.
   */
  autoPlay?: boolean;
  captions?: VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  sources: VibePlayerMediaSource[];
  title?: string;
  type: "file";
}

/** HLS manifest source rendered through managed hls.js or native HLS. */
export interface VibePlayerHlsSource {
  captions?: VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  live?: boolean;
  manifestUrl: string;
  posterUrl?: string | null;
  title?: string;
  type: "hls";
}

/** YouTube iframe source rendered through the YouTube adapter. */
export interface VibePlayerYouTubeSource {
  /** Label used by external YouTube handoff presentation. */
  externalActionLabel?: string;
  id: string;
  /**
   * Optional IFrame API origin override. Defaults to the current page origin
   * in browser runtimes.
   */
  origin?: string;
  posterUrl?: string | null;
  /**
   * `iframe` embeds the official player. `external` renders a package-owned
   * handoff surface and opens YouTube instead of creating an iframe.
   */
  presentation?: "external" | "iframe";
  startSeconds?: number;
  title?: string;
  type: "youtube";
  /** Optional IFrame API widget referrer for embedded widget integrations. */
  widgetReferrer?: string;
  youtubeVideoId: string;
}

/** Provider-agnostic source accepted by package controllers and stages. */
export type VibePlayerSource =
  | VibePlayerFileSource
  | VibePlayerHlsSource
  | VibePlayerYouTubeSource;

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
  muted: boolean;
  paused: boolean;
  playbackRate: number;
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
  getSnapshot(): VibePlayerSnapshot;
  readonly kind: VibePlayerSource["type"];
  load(source: VibePlayerSource): Promise<void>;
  mount(target: HTMLElement): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  seekTo(seconds: number): Promise<void>;
  setMuted(value: boolean): Promise<void>;
  setPlaybackRate(value: number): Promise<void>;
  setQuality?(qualityId: string): Promise<void>;
  setVolume(value: number): Promise<void>;
  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void;
  unmount(): Promise<void>;
}

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
