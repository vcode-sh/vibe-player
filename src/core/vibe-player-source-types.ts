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
