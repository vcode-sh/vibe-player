import type {
  VibePlayerCapabilities,
  VibePlayerSnapshot,
} from "./vibe-player-types";

interface DurationSource {
  duration: number;
}

export function createIdleCapabilities(): VibePlayerCapabilities {
  return {
    canFullscreen: false,
    canPictureInPicture: false,
    canSeek: false,
    canSetPlaybackRate: false,
    canShowCaptions: false,
    hasNativeCaptionsMenu: false,
    isLive: false,
    supportsDuration: false,
    supportsMute: false,
    supportsPlayback: false,
    supportsPoster: false,
    supportsQualitySelection: false,
    supportsVolumeControl: false,
  };
}

export function createIdleSnapshot(): VibePlayerSnapshot {
  return {
    currentTime: 0,
    duration: 0,
    muted: false,
    paused: true,
    playbackRate: 1,
    readyState: "idle",
    volume: 1,
  };
}

/** Media time as `m:ss`, or `h:mm:ss` from one hour; never rounds up. */
export function formatVibePlayerTime(seconds: number): string {
  const whole =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  }
  return `${minutes}:${rest}`;
}

export function getFiniteVibePlayerDuration(
  source: DurationSource,
  fallback: number | null
): number {
  if (Number.isFinite(source.duration) && source.duration > 0) {
    return source.duration;
  }
  return fallback ?? 0;
}

export function clampVibePlayerTime(
  seconds: number,
  duration: number,
  isLive: boolean
): number {
  if (!Number.isFinite(seconds) || seconds < 0 || isLive) {
    return 0;
  }
  if (!(Number.isFinite(duration) && duration > 0)) {
    return seconds;
  }
  return Math.min(seconds, duration);
}
