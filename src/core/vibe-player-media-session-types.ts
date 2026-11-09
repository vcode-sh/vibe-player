import type { VibePlayerSource } from "./vibe-player-source-types";

/** One artwork image for system media controls. */
export interface VibePlayerMediaSessionArtwork {
  /** Image dimensions, for example `"512x512"`. */
  sizes?: string | undefined;
  src: string;
  /** MIME type, for example `"image/jpeg"`. */
  type?: string | undefined;
}

/** What lock screens, notifications and media hubs show for the player. */
export interface VibePlayerMediaSessionMetadata {
  /** Context such as a show, channel or collection. */
  album?: string | undefined;
  /** Author, creator or presenter. */
  artist?: string | undefined;
  /**
   * Defaults to the source poster. A function receives the current source
   * and runs again whenever it changes, including a renewal, so signed
   * artwork can renew with the source. Returning `undefined` (or throwing)
   * falls back to the poster.
   */
  artwork?:
    | readonly VibePlayerMediaSessionArtwork[]
    | ((
        source: VibePlayerSource
      ) => readonly VibePlayerMediaSessionArtwork[] | undefined)
    | undefined;
  /** Defaults to the source title. */
  title?: string | undefined;
}

/** Opt-in system media controls for one player. */
export interface VibePlayerMediaSessionOptions {
  metadata?: VibePlayerMediaSessionMetadata | undefined;
  /** Registers the `nexttrack` action; omitted means no next button. */
  onNextTrack?: (() => void) | undefined;
  /** Registers the `previoustrack` action; omitted means no previous button. */
  onPreviousTrack?: (() => void) | undefined;
  /**
   * Registers `enterpictureinpicture` when the provider supports
   * Picture-in-Picture, which also lets desktop Chrome open it automatically
   * when the viewer switches tabs during audible playback. Default `true`.
   */
  pictureInPicture?: boolean | undefined;
  /** Used when the system does not send an offset. Default 10. */
  seekBackwardSeconds?: number | undefined;
  /** Used when the system does not send an offset. Default 10. */
  seekForwardSeconds?: number | undefined;
}

/** System media controls for a hook or assembly player. */
export interface UseVibePlayerMediaSessionOptions
  extends VibePlayerMediaSessionOptions {
  /**
   * Who owns the page's one media session. Omitted, the player claims it when
   * it becomes audible and keeps it while paused until it stops, closes,
   * fails, unmounts or another player claims it. Hosts with their own focus
   * registry pass `true` for the owning player and `false` for the others.
   */
  active?: boolean | undefined;
}

/**
 * A player's claim on the page's single media session. Claiming takes the
 * session from whichever player held it; releasing clears only what this
 * player set and does nothing once another player owns the session.
 */
export interface VibePlayerMediaSession {
  claim(): void;
  release(): void;
  setOptions(options: VibePlayerMediaSessionOptions): void;
}
