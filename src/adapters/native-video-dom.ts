import {
  createIdleSnapshot,
  getFiniteVibePlayerDuration,
} from "../core/vibe-player-time";
import type {
  VibePlayerCaptionTrack,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../core/vibe-player-types";

type NativeVideoEventEmitter = (event: VibePlayerEventName) => void;

interface NativeEventBinding {
  nativeEvent: keyof HTMLVideoElementEventMap;
  playerEvent: VibePlayerEventName;
}

export interface NativeVideoSourceMetadata {
  captions?: VibePlayerCaptionTrack[];
  crossOrigin?: "anonymous" | "use-credentials" | null;
  posterUrl?: string | null;
}

const nativeEventBindings: NativeEventBinding[] = [
  { nativeEvent: "canplay", playerEvent: "ready" },
  { nativeEvent: "durationchange", playerEvent: "durationchange" },
  { nativeEvent: "ended", playerEvent: "ended" },
  { nativeEvent: "error", playerEvent: "error" },
  { nativeEvent: "loadeddata", playerEvent: "ready" },
  { nativeEvent: "loadedmetadata", playerEvent: "ready" },
  { nativeEvent: "pause", playerEvent: "pause" },
  { nativeEvent: "play", playerEvent: "play" },
  { nativeEvent: "playing", playerEvent: "ready" },
  { nativeEvent: "ratechange", playerEvent: "ratechange" },
  { nativeEvent: "seeked", playerEvent: "ready" },
  { nativeEvent: "seeking", playerEvent: "buffering" },
  { nativeEvent: "stalled", playerEvent: "buffering" },
  { nativeEvent: "timeupdate", playerEvent: "timeupdate" },
  { nativeEvent: "volumechange", playerEvent: "volumechange" },
  { nativeEvent: "waiting", playerEvent: "buffering" },
];

export function appendNativeCaptionTracks(
  video: HTMLVideoElement,
  captions: VibePlayerCaptionTrack[] | undefined
): void {
  for (const caption of captions ?? []) {
    const track = document.createElement("track");
    track.default = false;
    track.kind = caption.kind;
    track.label = caption.label;
    track.src = caption.url;
    track.srclang = caption.language;
    video.append(track);
  }

  for (const track of Array.from(video.textTracks)) {
    track.mode = "disabled";
  }
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}

export function createNativeVideo(
  emit: NativeVideoEventEmitter
): HTMLVideoElement {
  const video = document.createElement("video");
  video.controls = false;
  video.className =
    "vibe-player-native-adapter-video vibe-player-file-adapter-video";
  for (const binding of nativeEventBindings) {
    video.addEventListener(binding.nativeEvent, () =>
      emit(binding.playerEvent)
    );
  }
  return video;
}

export function getNativeVideoSnapshot(
  video: HTMLVideoElement | null,
  isLive: boolean
): VibePlayerSnapshot {
  if (!video) {
    return createIdleSnapshot();
  }
  const duration = isLive ? 0 : getFiniteVibePlayerDuration(video, null);
  return {
    bufferedPct: getBufferedPct(video, duration),
    currentTime: video.currentTime,
    duration,
    muted: video.muted,
    paused: video.paused,
    playbackRate: video.playbackRate,
    readyState: getReadyState(video),
    volume: video.volume,
  };
}

export function setNativeVideoMetadata(
  video: HTMLVideoElement,
  source: NativeVideoSourceMetadata
): void {
  video.poster = source.posterUrl ?? "";
  video.preload = "metadata";
  if (source.crossOrigin) {
    video.crossOrigin = source.crossOrigin;
  } else {
    video.removeAttribute("crossorigin");
  }
  video.playsInline = true;
}

function getBufferedPct(video: HTMLVideoElement, duration: number): number {
  if (!(Number.isFinite(duration) && duration > 0)) {
    return 0;
  }
  const ranges = video.buffered;
  if (ranges.length === 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.max(0, (ranges.end(ranges.length - 1) / duration) * 100)
  );
}

function getReadyState(
  video: HTMLVideoElement
): VibePlayerSnapshot["readyState"] {
  if (video.error) {
    return "error";
  }
  if (video.ended) {
    return "ended";
  }
  if (!video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
    return "buffering";
  }
  if (!video.paused) {
    return "playing";
  }
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return "ready";
  }
  return "loading";
}
