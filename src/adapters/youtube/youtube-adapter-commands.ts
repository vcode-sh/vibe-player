import { clampVibePlayerTime } from "../../core/vibe-player-time";
import type {
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import type { YouTubePlayerHandle } from "./youtube-iframe-types";
import type { YouTubePlaybackWatchdog } from "./youtube-playback-watchdog";

export interface YouTubeAdapterCommandInput {
  emit: (type: VibePlayerEventName) => void;
  getPlayer: () => YouTubePlayerHandle | null;
  getSnapshot: () => VibePlayerSnapshot;
  watchdog: YouTubePlaybackWatchdog;
}

export function pauseYouTubeVideo(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  input.watchdog.cancelIntent();
  input.getPlayer()?.pauseVideo();
  return Promise.resolve();
}

export function playYouTubeVideo(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  const player = input.getPlayer();
  if (player) {
    input.watchdog.begin(input.getSnapshot().currentTime);
    player.playVideo();
  }
  return Promise.resolve();
}

export function seekYouTubeVideo(
  input: YouTubeAdapterCommandInput,
  seconds: number
): Promise<void> {
  const player = input.getPlayer();
  if (!player) {
    return Promise.resolve();
  }
  const time = clampVibePlayerTime(
    seconds,
    input.getSnapshot().duration,
    false
  );
  player.seekTo(time, true);
  input.emit("timeupdate");
  return Promise.resolve();
}

export function setYouTubeMuted(
  input: YouTubeAdapterCommandInput,
  value: boolean
): Promise<void> {
  if (value) {
    input.getPlayer()?.mute();
  } else {
    input.getPlayer()?.unMute();
  }
  input.emit("volumechange");
  return Promise.resolve();
}

export function setYouTubePlaybackRate(
  input: YouTubeAdapterCommandInput,
  value: number
): Promise<void> {
  input.getPlayer()?.setPlaybackRate(value);
  input.emit("ratechange");
  return Promise.resolve();
}

export function setYouTubeVolume(
  input: YouTubeAdapterCommandInput,
  value: number
): Promise<void> {
  input.getPlayer()?.setVolume(Math.min(100, Math.max(0, value * 100)));
  input.emit("volumechange");
  return Promise.resolve();
}

export async function enterYouTubeFullscreen(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  await input.getPlayer()?.getIframe?.()?.requestFullscreen?.();
  input.emit("fullscreenchange");
}

export async function exitYouTubeFullscreen(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  await document.exitFullscreen?.();
  input.emit("fullscreenchange");
}
