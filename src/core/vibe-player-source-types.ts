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

/** Media facts supplied by the host before an engine downloads metadata. */
export interface VibePlayerSourceMetadata {
  durationSeconds?: number;
  /** ISO date string or Unix epoch milliseconds. */
  expiresAt?: string | number;
  height?: number;
  width?: number;
}

/** A progressive MP4 source; never loads the HLS runtime. */
export interface VibePlayerMp4Source extends VibePlayerSourceMetadata {
  autoPlay?: boolean;
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  posterUrl?: string | null;
  title?: string;
  type: "mp4";
  url: string;
}

/** Direct MP4/WebM source rendered through the native file adapter. */
export interface VibePlayerFileSource extends VibePlayerSourceMetadata {
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
interface VibePlayerHlsSourceBase extends VibePlayerSourceMetadata {
  captions?: readonly VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  id: string;
  live?: boolean;
  posterUrl?: string | null;
  title?: string;
  type: "hls";
}

/** HLS source using the same URL field as progressive MP4 playback. */
export interface VibePlayerHlsUrlSource extends VibePlayerHlsSourceBase {
  manifestUrl?: string;
  url: string;
}

/** Legacy manifest field retained for existing integrations. */
export interface VibePlayerHlsManifestSource extends VibePlayerHlsSourceBase {
  manifestUrl: string;
  url?: string;
}

export type VibePlayerHlsSource =
  | VibePlayerHlsUrlSource
  | VibePlayerHlsManifestSource;

/** Provider-agnostic source accepted by package controllers and stages. */
export type VibePlayerSource =
  | VibePlayerFileSource
  | VibePlayerHlsSource
  | VibePlayerMp4Source;
