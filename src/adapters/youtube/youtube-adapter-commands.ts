import { clampVibePlayerTime } from "../../core/vibe-player-time";
import type {
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import type { AdapterFullscreen } from "../shared/adapter-fullscreen";
import type { YouTubePlayerHandle } from "./youtube-iframe-types";
import type { YouTubePlaybackIntent } from "./youtube-playback-intent";

export interface YouTubeAdapterCommandInput {
  emit: (type: VibePlayerEventName) => void;
  fullscreen: AdapterFullscreen;
  getPlayer: () => YouTubePlayerHandle | null;
  getSnapshot: () => VibePlayerSnapshot;
  playbackIntent: YouTubePlaybackIntent;
}

export function pauseYouTubeVideo(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  input.playbackIntent.cancel();
  input.getPlayer()?.pauseVideo();
  return Promise.resolve();
}

export function playYouTubeVideo(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  const player = input.getPlayer();
  if (player) {
    input.playbackIntent.begin(input.getSnapshot().currentTime);
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
  await input.fullscreen.enter();
}

export async function exitYouTubeFullscreen(
  input: YouTubeAdapterCommandInput
): Promise<void> {
  await input.fullscreen.exit();
}
