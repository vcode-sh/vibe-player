import {
  createIdleSnapshot,
  getFiniteVibePlayerDuration,
} from "../../core/vibe-player-time";
import type {
  VibePlayerAdapterEvent,
  VibePlayerCaptionTrack,
  VibePlayerEventName,
  VibePlayerSnapshot,
} from "../../core/vibe-player-types";
import {
  bindNativeSourceFailure,
  createNativeErrorPayload,
  hasNativeSourceFailure,
  resetNativeSourceFailure,
} from "./native-video-errors";
import { clearPendingNativeSeek } from "./native-video-seek";

type NativeVideoEventEmitter = (
  event: VibePlayerEventName,
  payload?: VibePlayerAdapterEvent["payload"]
) => void;

interface NativeEventBinding {
  nativeEvent: keyof HTMLVideoElementEventMap;
  playerEvent: VibePlayerEventName;
}

interface NativePlaybackProgress {
  buffering: boolean | null;
  time: number;
}

export interface NativeVideoSourceMetadata {
  captions?: readonly VibePlayerCaptionTrack[];
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
  { nativeEvent: "playing", playerEvent: "playing" },
  // Buffer, size and network hints only refresh the snapshot.
  { nativeEvent: "progress", playerEvent: "timeupdate" },
  { nativeEvent: "ratechange", playerEvent: "ratechange" },
  { nativeEvent: "resize", playerEvent: "timeupdate" },
  { nativeEvent: "seeked", playerEvent: "seeked" },
  { nativeEvent: "seeking", playerEvent: "seeking" },
  { nativeEvent: "stalled", playerEvent: "timeupdate" },
  { nativeEvent: "timeupdate", playerEvent: "timeupdate" },
  { nativeEvent: "volumechange", playerEvent: "volumechange" },
  { nativeEvent: "waiting", playerEvent: "buffering" },
];

const nativeEventCleanups = new WeakMap<HTMLVideoElement, () => void>();
const nativePlaybackProgress = new WeakMap<
  HTMLVideoElement,
  NativePlaybackProgress
>();

export function appendNativeCaptionTracks(
  video: HTMLVideoElement,
  captions: readonly VibePlayerCaptionTrack[] | undefined
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

export function createNativeVideo(
  emit: NativeVideoEventEmitter,
  target?: HTMLVideoElement
): HTMLVideoElement {
  const video = target ?? document.createElement("video");
  clearNativeVideoEvents(video);
  if (!target) {
    video.controls = false;
  }
  video.preload = "none";
  video.playsInline = true;
  video.classList.add(
    "vibe-player-native-adapter-video",
    "vibe-player-file-adapter-video"
  );
  bindNativeVideoEvents(video, emit);
  return video;
}

function bindNativeVideoEvents(
  video: HTMLVideoElement,
  emit: NativeVideoEventEmitter
): void {
  nativePlaybackProgress.set(video, {
    buffering: null,
    time: video.currentTime,
  });
  resetNativeSourceFailure(video);
  const cleanups = [bindNativeSourceFailure(video, emit)];
  for (const binding of nativeEventBindings) {
    const listener = () => {
      if (binding.playerEvent === "buffering" && video.paused) {
        return;
      }
      observeNativePlayback(video, binding.nativeEvent);
      const error = binding.playerEvent === "error" ? video.error : null;
      emit(
        binding.playerEvent,
        error
          ? createNativeErrorPayload(
              video,
              error.code,
              error.message || "Native video playback failed."
            )
          : undefined
      );
    };
    video.addEventListener(binding.nativeEvent, listener);
    cleanups.push(() =>
      video.removeEventListener(binding.nativeEvent, listener)
    );
  }
  nativeEventCleanups.set(video, () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  });
}

export function clearNativeVideoEvents(video: HTMLVideoElement): void {
  nativeEventCleanups.get(video)?.();
  nativeEventCleanups.delete(video);
  nativePlaybackProgress.delete(video);
}

function observeNativePlayback(
  video: HTMLVideoElement,
  event: keyof HTMLVideoElementEventMap
): void {
  const progress = nativePlaybackProgress.get(video);
  if (!progress) {
    return;
  }
  if (event === "waiting" || event === "seeking") {
    progress.buffering = true;
  } else if (
    event === "playing" ||
    (event === "timeupdate" &&
      !video.paused &&
      !video.seeking &&
      video.currentTime > progress.time)
  ) {
    progress.buffering = false;
  } else if (event === "play" || event === "pause") {
    progress.buffering = null;
  }
  progress.time = video.currentTime;
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
    videoHeight: video.videoHeight,
    videoWidth: video.videoWidth,
    volume: video.volume,
  };
}

export function setNativeVideoMetadata(
  video: HTMLVideoElement,
  source: NativeVideoSourceMetadata
): void {
  clearPendingNativeSeek(video);
  resetNativeSourceFailure(video);
  video.poster = source.posterUrl ?? "";
  video.preload = "none";
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

/**
 * Observed progress outranks a lagging `readyState`: WebKit can report
 * HAVE_CURRENT_DATA for a while after a seek although media already advances.
 */
function isNativeVideoStalled(video: HTMLVideoElement): boolean {
  const buffering = nativePlaybackProgress.get(video)?.buffering ?? null;
  if (buffering !== null) {
    return buffering || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  return video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
}

function getReadyState(
  video: HTMLVideoElement
): VibePlayerSnapshot["readyState"] {
  if (video.error || hasNativeSourceFailure(video)) {
    return "error";
  }
  if (video.ended) {
    return "ended";
  }
  if (video.seeking || (!video.paused && isNativeVideoStalled(video))) {
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
