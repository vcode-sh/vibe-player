import type { ReactNode } from "react";
import type { VibePlayerError } from "../core/vibe-player-controller-types";
import type { VibePlayerCapabilities } from "../core/vibe-player-runtime-types";

/** Visual preset for compact and feed players; both share one surface. */
export type VibePlayerCompactSkin = "chips" | "glass";

/** Chrome phase: `readyState` folded for UI, plus mid-playback renewal. */
export type VibePlayerSurfacePhase =
  | "ended"
  | "error"
  | "idle"
  | "loading"
  | "paused"
  | "playing"
  | "renewing";

/** Normalized state a compact skin (or a host overlay) renders from. */
export interface VibePlayerSurfaceState {
  /** Muted by autoplay and not yet changed by the viewer. */
  autoplayMuted: boolean;
  /** Loading/stalls after 320 ms, renewal after 600 ms; never fake progress. */
  busy: boolean;
  capabilities: VibePlayerCapabilities;
  /** Paused, scrubbing or recently steered; always false while hidden. */
  controlsVisible: boolean;
  /** Falls back to the source's `durationSeconds` before metadata loads. */
  duration: number;
  error: VibePlayerError | null;
  /**
   * The player is presented in fullscreen: a toggle's `aria-pressed`. `null`
   * while `onExpand` replaces fullscreen, because that button opens your own
   * view and has no pressed state.
   */
  fullscreen: boolean | null;
  /**
   * Why controls are held open: phase, scrub, or keyboard or
   * assistive-technology focus on a control (`"keyboard-focus"`).
   */
  hold: "keyboard-focus" | "phase" | "scrub" | null;
  muted: boolean;
  phase: VibePlayerSurfacePhase;
  /** The media plays in a Picture-in-Picture window. */
  pictureInPicture: boolean;
  /** Scrub or keyboard-seek target until the seek lands; null otherwise. */
  previewTime: number | null;
  scrubbing: boolean;
  /** Seconds a skip, arrow or J/L press and a double tap move (`seekStep`). */
  seekStep: number;
  /** Display time: preview, else playback time; frozen while hidden. */
  time: number;
}

/** Commands that keep scrub feedback and the chrome policy consistent. */
export interface VibePlayerSurfaceActions {
  /** Hides at once while playing, unless keyboard focus or a scrub holds. */
  hideControls(): void;
  pause(): void;
  play(): void;
  /** Phase-aware: play, pause, replay after the end, retry after an error. */
  primary(): void;
  retry(): void;
  /** Shows the controls and restarts the hide timer. */
  revealControls(): void;
  /** Ends a scrub; commits the previewed time unless `commit` is false. */
  scrubEnd(commit?: boolean): void;
  scrubStart(): void;
  /** Previews `fraction` (0..1) of the duration. */
  scrubTo(fraction: number): void;
  /** Seeks relative to the preview and shows scrub feedback for 700 ms. */
  seekBy(seconds: number): void;
  setMuted(muted: boolean): void;
  /** Calls the host's `onExpand` when given, else toggles fullscreen. */
  toggleFullscreen(): void;
  toggleMute(): void;
  togglePictureInPicture(): void;
}

/** Default parts a host may switch off; capabilities still apply. */
export interface VibePlayerCompactControls {
  /**
   * When the glass skin's centre Play/Replay button shows. `"always"`
   * (default) shows it whenever the media is not playing; `"except-paused"`
   * hides it while paused, when the capsule already offers Play, so small
   * players show one Play. Idle, loading and ended keep it. Chips has none.
   */
  centerButton?: "always" | "except-paused" | undefined;
  fullscreen?: boolean | undefined;
  mute?: boolean | undefined;
  /** Opt-in (default false); shown only where the provider supports it. */
  pictureInPicture?: boolean | undefined;
  seek?: boolean | undefined;
  /**
   * Opt-in (default false) skip back/forward buttons labelled with
   * `seekStep`; shown where the media can seek, from 280 px wide.
   */
  skip?: boolean | undefined;
  time?: boolean | undefined;
}

/** What a skin or a host overlay receives. */
export interface VibePlayerSurface {
  actions: VibePlayerSurfaceActions;
  controls: Required<VibePlayerCompactControls>;
  state: VibePlayerSurfaceState;
}

/** Replace one default state panel; `null` renders nothing for it. */
export interface VibePlayerCompactSlots {
  ended?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
  error?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
  idle?: ((surface: VibePlayerSurface) => ReactNode) | null | undefined;
}
