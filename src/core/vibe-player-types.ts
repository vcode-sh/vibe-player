export interface VibePlayerCaptionTrack {
  default?: boolean;
  id: string;
  kind: "captions" | "subtitles";
  label: string;
  language: string;
  url: string;
}

export interface VibePlayerMediaSource {
  mimeType: string;
  url: string;
}

export interface VibePlayerFileSource {
  autoPlay?: boolean;
  captions?: VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  sources: VibePlayerMediaSource[];
  title?: string;
  type: "file";
}

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

export interface VibePlayerYouTubeSource {
  id: string;
  posterUrl?: string | null;
  startSeconds?: number;
  title?: string;
  type: "youtube";
  youtubeVideoId: string;
}

export type VibePlayerSource =
  | VibePlayerFileSource
  | VibePlayerHlsSource
  | VibePlayerYouTubeSource;

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
  supportsPoster: boolean;
  supportsQualitySelection: boolean;
  supportsVolumeControl: boolean;
}

export interface VibePlayerSnapshot {
  bufferedPct?: number;
  currentTime: number;
  duration: number;
  muted: boolean;
  paused: boolean;
  playbackRate: number;
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
  | "ratechange"
  | "ready"
  | "timeupdate"
  | "volumechange";

export interface VibePlayerAdapterEvent {
  payload?: Record<string, string | number | boolean | null | undefined>;
  snapshot: VibePlayerSnapshot;
  type: VibePlayerEventName;
}

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
  setVolume(value: number): Promise<void>;
  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void;
  unmount(): Promise<void>;
}

export interface VibePlayerResumeStore {
  clear(sourceId: string): void;
  get(sourceId: string): number | null;
  set(sourceId: string, seconds: number): void;
}

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

export interface VibePlayerAnalyticsEvent {
  currentTime?: number;
  duration?: number;
  provider: VibePlayerSource["type"];
  sourceId: string;
  type: VibePlayerAnalyticsEventName;
}

export interface VibePlayerControllerState {
  capabilities: VibePlayerCapabilities | null;
  currentSource: VibePlayerSource | null;
  isMounted: boolean;
  lastEvent: VibePlayerEventName | null;
  playbackBlocked: boolean;
  snapshot: VibePlayerSnapshot;
}

export interface VibePlayerControllerOptions {
  adapterFactory: (source: VibePlayerSource) => VibePlayerAdapter;
  onAnalyticsEvent?: (event: VibePlayerAnalyticsEvent) => void;
  resumeStore?: VibePlayerResumeStore;
}
