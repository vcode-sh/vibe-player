import type { VibePlayerEventName } from "../../core/vibe-player-types";

interface PendingNativeSeek {
  cancel: () => void;
  seconds: number;
}

const pendingSeeks = new WeakMap<HTMLVideoElement, PendingNativeSeek>();

/** Source attachment may reset a seek made before metadata; keep the intent. */
export function seekNativeVideoTo(
  video: HTMLVideoElement,
  seconds: number,
  emit: (type: VibePlayerEventName) => void
): void {
  clearPendingNativeSeek(video);
  if (video.readyState === 0) {
    const onMetadata = () => {
      clearPendingNativeSeek(video);
      video.currentTime = seconds;
      emit("timeupdate");
    };
    pendingSeeks.set(video, {
      cancel: () => video.removeEventListener("loadedmetadata", onMetadata),
      seconds,
    });
    video.addEventListener("loadedmetadata", onMetadata, { once: true });
  }
  try {
    video.currentTime = seconds;
  } catch (error) {
    if (video.readyState !== 0) {
      throw error;
    }
  }
}

export function getNativeVideoStartPosition(video: HTMLVideoElement): number {
  return pendingSeeks.get(video)?.seconds ?? video.currentTime;
}

export function clearPendingNativeSeek(video: HTMLVideoElement): void {
  pendingSeeks.get(video)?.cancel();
  pendingSeeks.delete(video);
}
