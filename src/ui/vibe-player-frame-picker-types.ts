import type { VibePlayerAdapterOptions } from "../adapters/create-vibe-player-adapter";
import type {
  VibePlayerControllerOptions,
  VibePlayerError,
  VibePlayerSource,
} from "../core";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

/** Frame picker strings; each one has an English default. */
export interface VibePlayerFramePickerLabels {
  /** The slider's accessible name. Default `"Cover frame"`. */
  slider?: string | undefined;
  /**
   * The slider's `aria-valuetext`. Default `"0:07.3 of 1:05"`: the time to a
   * tenth of a second, then the duration.
   */
  valueText?: ((seconds: number, duration: number) => string) | undefined;
}

/** Host classes added to the picker parts; package classes stay. */
export interface VibePlayerFramePickerClassNames {
  /** The frame box holding the video and the storyboard tile. */
  frame?: string | undefined;
  /** The video element. */
  media?: string | undefined;
  /** The slider (rail, filmstrip and thumb). */
  rail?: string | undefined;
  root?: string | undefined;
  /** The filmstrip behind the rail, drawn with `seekThumbnails`. */
  strip?: string | undefined;
  thumb?: string | undefined;
  /** The storyboard tile shown over the frame while a seek is in flight. */
  tile?: string | undefined;
}

/**
 * A paused, muted frame of `source` at `value` with a slider to choose it,
 * e.g. a video's cover frame. Controlled: render the time you get back.
 */
export interface VibePlayerFramePickerProps extends VibePlayerAdapterOptions {
  /** Replaces the built-in file/HLS adapter selection, e.g. in tests. */
  adapterFactory?: VibePlayerControllerOptions["adapterFactory"] | undefined;
  className?: string | undefined;
  classNames?: VibePlayerFramePickerClassNames | undefined;
  /**
   * How the video fills the frame box: `contain` (default) letterboxes,
   * `cover` crops.
   */
  fit?: "contain" | "cover" | undefined;
  labels?: VibePlayerFramePickerLabels | undefined;
  /**
   * Called with each time the user picks, in seconds within the duration:
   * on pointer down, on every move while dragging and on every key press.
   * Release sends nothing more; the last call is the pick. It is also called
   * once with the clamped time when the duration becomes known and `value`
   * lies outside it.
   */
  onChange: (seconds: number) => void;
  /** The media failed to load; the frame stays empty and the slider disabled. */
  onError?: ((error: VibePlayerError) => void) | undefined;
  /**
   * Storyboard tiles (the player's `seekThumbnails`): drawn as a filmstrip
   * behind the rail, and the tile at `value` covers the frame while a seek is
   * in flight.
   */
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
  /** A file or HLS source; it loads at once, never plays and stays muted. */
  source: VibePlayerSource;
  /** The picked time in seconds; clamped to the duration once known. */
  value: number;
}
