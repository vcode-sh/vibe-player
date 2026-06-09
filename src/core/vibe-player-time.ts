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

export function formatVibePlayerTime(seconds: number): string {
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return "00:00";
  }
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
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
