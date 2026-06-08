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
  element: HTMLElement;
  onError: (payload: YouTubeAdapterErrorPayload) => void;
  onPlaybackRateChange: () => void;
  onReady: () => void;
  onStateChange: (state: YouTubePlayerState) => void;
  startSeconds?: number;
  videoId: string;
}

export interface YouTubePlayerHandle {
  destroy(): void;
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
    onError: (event: YouTubeIframeEvent) => void;
    onPlaybackRateChange: () => void;
    onReady: () => void;
    onStateChange: (event: YouTubeIframeEvent) => void;
  };
  playerVars: {
    playsinline: 1;
    rel: 0;
    start?: number;
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
    onYouTubeIframeAPIReady?: () => void;
    YT?: YouTubeIframeApi;
  }
}
