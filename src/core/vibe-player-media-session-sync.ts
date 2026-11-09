import type {
  VibePlayerMediaSessionArtwork,
  VibePlayerMediaSessionMetadata,
  VibePlayerMediaSessionOptions,
} from "./vibe-player-media-session-types";
import type {
  VibePlayerCapabilities,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "./vibe-player-types";

/** Actions the package registers; the DOM library lacks the PiP action. */
export type VibePlayerMediaSessionAction =
  | "enterpictureinpicture"
  | "nexttrack"
  | "pause"
  | "play"
  | "previoustrack"
  | "seekbackward"
  | "seekforward"
  | "seekto"
  | "stop";

export type VibePlayerMediaSessionHandler = (
  details: MediaSessionActionDetails
) => void;

/** The parts of `navigator.mediaSession` the package uses. */
export interface PageMediaSession {
  metadata: MediaMetadata | null;
  playbackState: MediaSessionPlaybackState;
  setActionHandler(
    action: string,
    handler: VibePlayerMediaSessionHandler | null
  ): void;
  setPositionState?(state?: MediaPositionState): void;
}

/** The position last given to the session, for drift checks. */
export interface MediaSessionPositionMark {
  at: number;
  duration: number;
  playing: boolean;
  position: number;
  rate: number;
}

const DRIFT_SECONDS = 1;

export function getPageMediaSession(): PageMediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator
    ? navigator.mediaSession
    : null;
}

/** Unsupported actions throw a TypeError; they simply stay unregistered. */
export function setMediaSessionAction(
  session: PageMediaSession,
  action: VibePlayerMediaSessionAction,
  handler: VibePlayerMediaSessionHandler | null
): void {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // The browser does not know this action.
  }
}

export function createMediaSessionMetadataInit(
  options: VibePlayerMediaSessionOptions,
  source: VibePlayerSource | null
): MediaMetadataInit {
  const { album, artist, artwork, title } = options.metadata ?? {};
  const poster = source?.posterUrl;
  const images =
    resolveArtwork(artwork, source) ?? (poster ? [{ src: poster }] : []);
  return {
    album: album ?? "",
    artist: artist ?? "",
    artwork: images.map(({ sizes, src, type }) => ({
      src,
      ...(sizes ? { sizes } : {}),
      ...(type ? { type } : {}),
    })),
    title: title ?? source?.title ?? "",
  };
}

/** A function is asked for the current source; a failure means no artwork. */
function resolveArtwork(
  artwork: VibePlayerMediaSessionMetadata["artwork"],
  source: VibePlayerSource | null
): readonly VibePlayerMediaSessionArtwork[] | undefined {
  if (typeof artwork !== "function") {
    return artwork;
  }
  if (!source) {
    return;
  }
  try {
    return artwork(source);
  } catch {
    // Host artwork failed; the poster stands in.
  }
}

export function clearMediaSessionPosition(session: PageMediaSession): void {
  try {
    session.setPositionState?.();
  } catch {
    // Nothing to clear in this browser.
  }
}

/**
 * Browsers extrapolate position from rate and playback state, so the session
 * hears only about discontinuities: seeks, stalls, rate, duration and
 * play/pause changes. Live and unknown durations clear the position.
 */
export function syncMediaSessionPosition(
  session: PageMediaSession,
  snapshot: VibePlayerSnapshot,
  capabilities: VibePlayerCapabilities | null,
  mark: MediaSessionPositionMark | null,
  now: number
): MediaSessionPositionMark | null {
  const { currentTime, duration, paused, playbackRate, readyState } = snapshot;
  if (capabilities?.isLive || !Number.isFinite(duration) || duration <= 0) {
    if (mark) {
      clearMediaSessionPosition(session);
    }
    return null;
  }
  const rate = playbackRate > 0 ? playbackRate : 1;
  const playing = !paused && readyState === "playing";
  const position = Math.min(Math.max(currentTime, 0), duration);
  if (
    mark?.duration === duration &&
    mark.rate === rate &&
    mark.playing === playing
  ) {
    const elapsed = playing ? ((now - mark.at) / 1000) * rate : 0;
    if (Math.abs(mark.position + elapsed - position) < DRIFT_SECONDS) {
      return mark;
    }
  }
  try {
    session.setPositionState?.({ duration, playbackRate: rate, position });
  } catch {
    return null;
  }
  return { at: now, duration, playing, position, rate };
}
