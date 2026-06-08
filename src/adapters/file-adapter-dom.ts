import { createIdleCapabilities } from "../core/vibe-player-time";
import type {
  VibePlayerCapabilities,
  VibePlayerFileSource,
  VibePlayerSnapshot,
} from "../core/vibe-player-types";
import {
  appendNativeCaptionTracks,
  clearElement as clearNativeElement,
  createNativeVideo,
  getNativeVideoSnapshot,
  setNativeVideoMetadata,
} from "./native-video-dom";

export { clearElement } from "./native-video-dom";
export const createFileVideo = createNativeVideo;

export function getFileVideoCapabilities(
  video: HTMLVideoElement | null,
  source: VibePlayerFileSource | null
): VibePlayerCapabilities {
  return {
    ...createIdleCapabilities(),
    canFullscreen: Boolean(video?.requestFullscreen),
    canSeek: true,
    canSetPlaybackRate: true,
    canShowCaptions: Boolean(source?.captions?.length),
    supportsDuration: true,
    supportsMute: true,
    supportsPoster: Boolean(source?.posterUrl),
    supportsVolumeControl: true,
  };
}

export function getFileVideoSnapshot(
  video: HTMLVideoElement | null
): VibePlayerSnapshot {
  return getNativeVideoSnapshot(video, false);
}

export function setFileVideoSource(
  video: HTMLVideoElement,
  source: VibePlayerFileSource
): void {
  clearNativeElement(video);
  setNativeVideoMetadata(video, source);

  for (const sourceOption of source.sources) {
    const sourceElement = document.createElement("source");
    sourceElement.src = sourceOption.url;
    sourceElement.type = sourceOption.mimeType;
    video.append(sourceElement);
  }

  appendNativeCaptionTracks(video, source.captions);
}
