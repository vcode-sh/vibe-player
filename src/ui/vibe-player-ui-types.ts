import type { ComponentType, SVGProps } from "react";

/** Ready-made chrome; the bare-video binding is a separate component. */
export type VibePlayerVariant = "compact" | "feed" | "full";

/** SVG props accepted by built-in icons and host icon components. */
export interface VibePlayerIconProps
  extends Pick<
    SVGProps<SVGSVGElement>,
    "aria-hidden" | "className" | "focusable"
  > {}

/** Optional replacements, including Tabler's React SVG components. */
export interface VibePlayerIcons {
  captions?: ComponentType<VibePlayerIconProps>;
  check?: ComponentType<VibePlayerIconProps>;
  chevronDown?: ComponentType<VibePlayerIconProps>;
  close?: ComponentType<VibePlayerIconProps>;
  fullscreenEnter?: ComponentType<VibePlayerIconProps>;
  fullscreenExit?: ComponentType<VibePlayerIconProps>;
  mute?: ComponentType<VibePlayerIconProps>;
  pause?: ComponentType<VibePlayerIconProps>;
  pictureInPicture?: ComponentType<VibePlayerIconProps>;
  play?: ComponentType<VibePlayerIconProps>;
  replay?: ComponentType<VibePlayerIconProps>;
  retry?: ComponentType<VibePlayerIconProps>;
  /** Skip back and the double-tap indicator; the step is drawn inside it. */
  seekBackward?: ComponentType<VibePlayerIconProps>;
  /** Skip forward and the double-tap indicator. */
  seekForward?: ComponentType<VibePlayerIconProps>;
  settings?: ComponentType<VibePlayerIconProps>;
  /** Compact error panel glyph, e.g. Tabler's `IconVideoOff`. */
  unavailable?: ComponentType<VibePlayerIconProps>;
  volume?: ComponentType<VibePlayerIconProps>;
  volumeHigh?: ComponentType<VibePlayerIconProps>;
  volumeLow?: ComponentType<VibePlayerIconProps>;
}

/** Strings and dynamic descriptions used by package chrome. */
export interface VibePlayerLabels {
  adaptiveQuality: string;
  autoQuality: string;
  bitrate: (megabits: number) => string;
  buffering: string;
  captionsShortcut: string;
  captionsUnavailable: string;
  close: string;
  /**
   * Reserved for custom controls. Package fullscreen toggles keep
   * `fullscreen` as their name and expose the state with `aria-pressed`.
   */
  exitFullscreen: string;
  exitPictureInPicture: string;
  fixedQuality: string;
  fullscreen: string;
  fullscreenShortcut: string;
  hideCaptions: string;
  loading: string;
  manualQuality: string;
  /** Heatmap preview near a peak. */
  mostReplayed: string;
  mute: string;
  muteShortcut: string;
  pause: string;
  /** Announced after a keyboard pause, e.g. "Paused". */
  paused?: string;
  pictureInPicture: string;
  play: string;
  playbackSpeed: string;
  playbackSpeedValue: (rate: string) => string;
  /** Announced after keyboard play, e.g. "Playing". */
  playing?: string;
  playShortcut: string;
  playToStart: string;
  quality: string;
  qualityValue: (quality: string) => string;
  replay: string;
  /** Heatmap preview elsewhere: the slice's 0..1 value as text, e.g.
   * "31% of viewers" for 0.31. The default "" shows only the time. */
  replayValue: (value: number) => string;
  retry: string;
  retryCaptions: string;
  seek: string;
  /** Skip back button, e.g. "Back 10 seconds". Defaults are provided. */
  seekBackward?: (seconds: number) => string;
  /** Skip forward button, e.g. "Forward 10 seconds". */
  seekForward?: (seconds: number) => string;
  /** Double-tap indicator total, e.g. "20 seconds". */
  seekOffset?: (seconds: number) => string;
  seekShortcut: string;
  /** Timeline value text, also announced after keyboard seeks. */
  seekValue: (time: string, duration: string) => string;
  showCaptions: string;
  unavailable: string;
  unmute: string;
  videoPlayer: string;
  videoPlayerTitle: (title: string) => string;
  volume: string;
  volumeTrigger: (action: string, percent: number) => string;
  volumeValue: (percent: number, muted: boolean) => string;
}

/**
 * Host classes augment, rather than replace, scoped package classes. Compact
 * parts also carry a stable `data-part` attribute for host CSS.
 */
export interface VibePlayerClassNames {
  button?: string;
  captions?: string;
  controls?: string;
  duration?: string;
  /** Compact error panel. */
  error?: string;
  media?: string;
  playButton?: string;
  poster?: string;
  progress?: string;
  retry?: string;
  root?: string;
  status?: string;
  /** Compact elapsed or remaining time. */
  time?: string;
  unmute?: string;
}
