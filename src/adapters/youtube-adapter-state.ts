import {
  createIdleCapabilities,
  createIdleSnapshot,
} from "../core/vibe-player-time";
import type {
  VibePlayerCapabilities,
  VibePlayerSnapshot,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import type {
  YouTubePlayerHandle,
  YouTubePlayerState,
} from "./youtube-iframe-types";
import { youtubePlayerStates } from "./youtube-iframe-types";

export function getYouTubeCapabilities(
  player: YouTubePlayerHandle | null,
  source: VibePlayerYouTubeSource | null
): VibePlayerCapabilities {
  if (!source) {
    return createIdleCapabilities();
  }
  const iframe = player?.getIframe?.() ?? null;
  return {
    canFullscreen: Boolean(iframe?.requestFullscreen),
    canPictureInPicture: false,
    canSeek: true,
    canSetPlaybackRate: true,
    canShowCaptions: false,
    hasNativeCaptionsMenu: true,
    isLive: false,
    supportsDuration: true,
    supportsMute: true,
    supportsPoster: false,
    supportsQualitySelection: false,
    supportsVolumeControl: true,
  };
}

export function getYouTubeSnapshot(
  player: YouTubePlayerHandle | null,
  playerState: YouTubePlayerState
): VibePlayerSnapshot {
  if (!player) {
    return createIdleSnapshot();
  }
  return {
    bufferedPct: getBufferedPct(player),
    currentTime: getFinitePlayerValue(player.getCurrentTime()),
    duration: getFinitePlayerValue(player.getDuration()),
    muted: player.isMuted(),
    paused: playerState !== youtubePlayerStates.playing,
    playbackRate: getPlaybackRate(player),
    readyState: getReadyState(playerState),
    volume: getVolume(player),
  };
}

function getBufferedPct(player: YouTubePlayerHandle): number {
  const fraction = player.getVideoLoadedFraction?.() ?? 0;
  if (!(Number.isFinite(fraction) && fraction > 0)) {
    return 0;
  }
  return Math.min(100, fraction * 100);
}

function getFinitePlayerValue(value: number): number {
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 0;
}

function getPlaybackRate(player: YouTubePlayerHandle): number {
  const rate = player.getPlaybackRate();
  if (Number.isFinite(rate) && rate > 0) {
    return rate;
  }
  return 1;
}

function getReadyState(
  state: YouTubePlayerState
): VibePlayerSnapshot["readyState"] {
  if (state === youtubePlayerStates.ended) {
    return "ended";
  }
  if (state === youtubePlayerStates.playing) {
    return "playing";
  }
  if (
    state === youtubePlayerStates.paused ||
    state === youtubePlayerStates.cued
  ) {
    return "ready";
  }
  return "loading";
}

function getVolume(player: YouTubePlayerHandle): number {
  const volume = player.getVolume() / 100;
  if (Number.isFinite(volume)) {
    return Math.min(1, Math.max(0, volume));
  }
  return 1;
}
