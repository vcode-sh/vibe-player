import { createIdleCapabilities } from "../../core/vibe-player-time";
import type {
  VibePlayerCapabilities,
  VibePlayerFileSource,
  VibePlayerMp4Source,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import { canUseNativePictureInPicture } from "../native/native-picture-in-picture";
import {
  appendNativeCaptionTracks,
  createNativeVideo,
  getNativeVideoSnapshot,
  setNativeVideoMetadata,
} from "../native/native-video-dom";
import { supportsNativeVolumeControl } from "../native/native-volume-control";
import { clearElement } from "../shared/clear-element";

export const createFileVideo = createNativeVideo;

export function getFileVideoCapabilities(
  video: HTMLVideoElement | null,
  source: VibePlayerFileSource | VibePlayerMp4Source | null
): VibePlayerCapabilities {
  if (!(video && source)) {
    return createIdleCapabilities();
  }
  return {
    ...createIdleCapabilities(),
    canFullscreen: Boolean(video.requestFullscreen),
    canPictureInPicture: canUseNativePictureInPicture(video),
    canSeek: true,
    canSetPlaybackRate: true,
    canShowCaptions: Boolean(source?.captions?.length),
    supportsDuration: true,
    supportsMute: true,
    supportsPlayback: true,
    supportsPoster: Boolean(source?.posterUrl),
    supportsVolumeControl: supportsNativeVolumeControl(video),
  };
}

export function getFileVideoSnapshot(
  video: HTMLVideoElement | null
): VibePlayerSnapshot {
  return getNativeVideoSnapshot(video, false);
}

export function setFileVideoSource(
  video: HTMLVideoElement,
  source: VibePlayerFileSource | VibePlayerMp4Source
): void {
  clearElement(video);
  video.removeAttribute("src");
  video.autoplay = source.autoPlay === true;
  setNativeVideoMetadata(video, source);

  if (source.type === "mp4") {
    video.src = source.url;
    appendNativeCaptionTracks(video, source.captions);
    return;
  }

  if (source.sources.length === 1) {
    const [sourceOption] = source.sources;
    if (sourceOption) {
      video.src = sourceOption.url;
    }
    appendNativeCaptionTracks(video, source.captions);
    return;
  }

  for (const sourceOption of source.sources) {
    const sourceElement = document.createElement("source");
    sourceElement.src = sourceOption.url;
    sourceElement.type = sourceOption.mimeType;
    video.append(sourceElement);
  }

  appendNativeCaptionTracks(video, source.captions);
}
