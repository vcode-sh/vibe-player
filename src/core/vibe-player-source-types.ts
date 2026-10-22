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
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  sources: readonly VibePlayerMediaSource[];
  title?: string;
  type: "file";
}

/** HLS manifest source rendered through managed hls.js or native HLS. */
export interface VibePlayerHlsSource {
  captions?: readonly VibePlayerCaptionTrack[];
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
  /**
   * Startup caption language preference passed to the official player as
   * `cc_lang_pref`, for example `"en"`. It is a preference, not a guarantee
   * that the video has that track.
   */
  captionLanguage?: string;
  /**
   * Embedded player control ownership. `custom` (default) hides YouTube's
   * native control bar and renders package controls outside the video.
   * `native` shows YouTube's own controls, including its caption and quality
   * menus, and suppresses package playback controls. Changing it starts a new
   * source session.
   */
  controls?: "custom" | "native";
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
  /**
   * `true` asks the official player to show captions at startup
   * (`cc_load_policy=1`). Omitting it or passing `false` leaves the viewer's
   * and YouTube's own caption preferences in effect; it does not force
   * captions off.
   */
  showCaptionsByDefault?: boolean;
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
