import { createIdleCapabilities } from "../../core/vibe-player-time";
import type {
  VibePlayerCapabilities,
  VibePlayerHlsSource,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import { canUseNativePictureInPicture } from "../native/native-picture-in-picture";
import {
  appendNativeCaptionTracks,
  getNativeVideoSnapshot,
  setNativeVideoMetadata,
} from "../native/native-video-dom";
import { clearElement } from "../shared/clear-element";

type HlsLoadMode = "managed" | "native";

const hlsMimeTypes = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegURL",
] as const;

const nativeHlsVideos = new WeakSet<HTMLVideoElement>();

export function isNativeHlsVideo(video: HTMLVideoElement): boolean {
  return nativeHlsVideos.has(video);
}

export function getHlsManifestUrl(source: VibePlayerHlsSource): string {
  const url = source.url ?? source.manifestUrl;
  if (!url) {
    throw new Error("HLS source must include a manifest URL.");
  }
  return url;
}

export function canUseNativeHls(video: HTMLVideoElement): boolean {
  for (const mimeType of hlsMimeTypes) {
    if (video.canPlayType(mimeType)) {
      return true;
    }
  }
  return false;
}

export function getHlsVideoCapabilities(
  video: HTMLVideoElement | null,
  source: VibePlayerHlsSource | null,
  isLive: boolean,
  supportsQualitySelection: boolean
): VibePlayerCapabilities {
  if (!(video && source)) {
    return createIdleCapabilities();
  }
  return {
    ...createIdleCapabilities(),
    canFullscreen: Boolean(video.requestFullscreen),
    canPictureInPicture: canUseNativePictureInPicture(video),
    canSeek: !isLive,
    canSetPlaybackRate: true,
    canShowCaptions: Boolean(source?.captions?.length),
    isLive,
    supportsDuration: !isLive,
    supportsMute: true,
    supportsPlayback: true,
    supportsPoster: Boolean(source?.posterUrl),
    supportsQualitySelection,
    supportsVolumeControl: true,
  };
}

export function getHlsVideoSnapshot(
  video: HTMLVideoElement | null,
  isLive: boolean
): VibePlayerSnapshot {
  return getNativeVideoSnapshot(video, isLive);
}

export function setHlsVideoSource(
  video: HTMLVideoElement,
  source: VibePlayerHlsSource,
  mode: HlsLoadMode
): void {
  clearElement(video);
  setNativeVideoMetadata(video, source);

  if (mode === "native") {
    nativeHlsVideos.add(video);
    video.src = getHlsManifestUrl(source);
  } else {
    nativeHlsVideos.delete(video);
    video.removeAttribute("src");
  }

  appendNativeCaptionTracks(video, source.captions);
}
