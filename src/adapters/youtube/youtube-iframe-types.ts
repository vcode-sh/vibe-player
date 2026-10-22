export const youtubePlayerStates = {
  buffering: 3,
  cued: 5,
  ended: 0,
  paused: 2,
  playing: 1,
  unstarted: -1,
} as const;

export type YouTubePlayerState =
  (typeof youtubePlayerStates)[keyof typeof youtubePlayerStates];

export interface YouTubeAdapterErrorPayload
  extends Record<string, number | string> {
  code: number;
  message: string;
}

export interface YouTubePlayerSession {
  /** Startup caption language preference (`cc_lang_pref`). */
  captionLanguage?: string;
  /** Native control bar ownership; omitted means package-owned `custom`. */
  controls?: "custom" | "native";
  element: HTMLElement;
  onAutoplayBlocked?: () => void;
  onError: (payload: YouTubeAdapterErrorPayload) => void;
  onPlaybackRateChange: () => void;
  onReady: () => void;
  onStateChange: (state: YouTubePlayerState) => void;
  origin?: string;
  /** Requests captions at startup (`cc_load_policy=1`) only when true. */
  showCaptionsByDefault?: boolean;
  /** Cancels pending SDK creation; an already-ready injected handle may return synchronously. */
  signal?: AbortSignal;
  startSeconds?: number;
  videoId: string;
  widgetReferrer?: string;
}

export interface YouTubePlayerHandle {
  destroy(): void;
  getAvailablePlaybackRates?(): number[];
  getCurrentTime(): number;
  getDuration(): number;
  getIframe?(): HTMLIFrameElement;
  getPlaybackRate(): number;
  getVideoLoadedFraction?(): number;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(value: number): void;
  setVolume(value: number): void;
  unMute(): void;
}

export interface YouTubeAdapterRuntime {
  createPlayer(
    session: YouTubePlayerSession
  ): Promise<YouTubePlayerHandle> | YouTubePlayerHandle;
}

export interface YouTubeIframeEvent {
  data: number;
}

export interface YouTubeIframePlayerOptions {
  events: {
    onAutoplayBlocked?: () => void;
    onError: (event: YouTubeIframeEvent) => void;
    onPlaybackRateChange: () => void;
    onReady: () => void;
    onStateChange: (event: YouTubeIframeEvent) => void;
  };
  playerVars: {
    cc_lang_pref?: string;
    cc_load_policy?: 1;
    controls: 0 | 1;
    origin: string;
    playsinline: 1;
    rel: 0;
    start?: number;
    widget_referrer?: string;
  };
  videoId: string;
}

export interface YouTubeIframePlayerConstructor {
  new (
    element: HTMLElement,
    options: YouTubeIframePlayerOptions
  ): YouTubePlayerHandle;
}

export interface YouTubeIframeApi {
  Player: YouTubeIframePlayerConstructor;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: YouTubeIframeApi | undefined;
  }
}
