import { clampVibePlayerTime } from "../../core/vibe-player-time";
import type {
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import { clearElement } from "../shared/clear-element";
import { enterNativePictureInPicture } from "./native-picture-in-picture";

export interface NativePlaybackResolution {
  activeVideo: HTMLVideoElement | null;
  currentGeneration: number;
  expectedGeneration: number;
  mounted: boolean;
  video: HTMLVideoElement;
}

export interface PlayGuardedNativeVideoInput {
  expectedGeneration: number;
  getActiveVideo: () => HTMLVideoElement | null;
  getCurrentGeneration: () => number;
  isMounted: () => boolean;
  video: HTMLVideoElement;
}

export interface NativeVideoCommandInput {
  canSeek?: () => boolean;
  emit: (type: VibePlayerEventName) => void;
  getPlaybackGeneration: () => number;
  getSnapshot: () => VibePlayerSnapshot;
  getVideo: () => HTMLVideoElement | null;
  incrementPlaybackGeneration: () => number;
  isMounted: () => boolean;
}

export async function playGuardedNativeVideo({
  expectedGeneration,
  getActiveVideo,
  getCurrentGeneration,
  isMounted,
  video,
}: PlayGuardedNativeVideoInput): Promise<void> {
  await video.play();
  if (
    shouldPauseResolvedNativePlayback({
      activeVideo: getActiveVideo(),
      currentGeneration: getCurrentGeneration(),
      expectedGeneration,
      mounted: isMounted(),
      video,
    })
  ) {
    video.pause();
  }
}

export function pauseNativeVideo(
  input: NativeVideoCommandInput
): Promise<void> {
  input.incrementPlaybackGeneration();
  input.getVideo()?.pause();
  return Promise.resolve();
}

export async function playNativeVideo(
  input: NativeVideoCommandInput
): Promise<void> {
  const video = input.getVideo();
  if (!video) {
    return;
  }
  const playbackGeneration = input.incrementPlaybackGeneration();
  await playGuardedNativeVideo({
    expectedGeneration: playbackGeneration,
    getActiveVideo: input.getVideo,
    getCurrentGeneration: input.getPlaybackGeneration,
    isMounted: input.isMounted,
    video,
  });
}

export function seekNativeVideo(
  input: NativeVideoCommandInput,
  seconds: number
): Promise<void> {
  const video = input.getVideo();
  if (!(video && (input.canSeek?.() ?? true))) {
    return Promise.resolve();
  }
  video.currentTime = clampVibePlayerTime(
    seconds,
    input.getSnapshot().duration,
    false
  );
  input.emit("timeupdate");
  return Promise.resolve();
}

export function setNativeVideoMuted(
  input: NativeVideoCommandInput,
  value: boolean
): Promise<void> {
  const video = input.getVideo();
  if (video) {
    video.muted = value;
    input.emit("volumechange");
  }
  return Promise.resolve();
}

export function setNativeVideoPlaybackRate(
  input: NativeVideoCommandInput,
  value: number
): Promise<void> {
  const video = input.getVideo();
  if (video) {
    video.playbackRate = value;
    input.emit("ratechange");
  }
  return Promise.resolve();
}

export function setNativeVideoVolume(
  input: NativeVideoCommandInput,
  value: number
): Promise<void> {
  const video = input.getVideo();
  if (video) {
    video.volume = clampNativeVideoVolume(value);
    input.emit("volumechange");
  }
  return Promise.resolve();
}

export async function enterNativeVideoFullscreen(
  input: NativeVideoCommandInput
): Promise<void> {
  await input.getVideo()?.requestFullscreen();
  input.emit("fullscreenchange");
}

export async function exitNativeVideoFullscreen(
  input: NativeVideoCommandInput
): Promise<void> {
  await document.exitFullscreen?.();
  input.emit("fullscreenchange");
}

export async function enterNativeVideoPictureInPicture(
  input: NativeVideoCommandInput
): Promise<void> {
  await enterNativePictureInPicture(input.getVideo());
}

export function shouldPauseResolvedNativePlayback({
  activeVideo,
  currentGeneration,
  expectedGeneration,
  mounted,
  video,
}: NativePlaybackResolution): boolean {
  return (
    currentGeneration !== expectedGeneration ||
    activeVideo !== video ||
    !(mounted && video.isConnected)
  );
}

export function clampNativeVideoVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clearNativeVideoPlayback(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute("src");
  clearElement(video);
  video.load();
  video.remove();
}
