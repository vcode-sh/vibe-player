import type {
  VibePlayerAdapterEvent,
  VibePlayerEventName,
} from "../../core/vibe-player-types";

type NativeErrorEmitter = (
  event: VibePlayerEventName,
  payload: VibePlayerAdapterEvent["payload"]
) => void;

// MediaError codes: 1 aborted, 2 network, 3 decode, 4 source not supported.
const mediaErrorKinds = ["unknown", "unknown", "network", "decode", "source"];
const failedSourceLists = new WeakSet<HTMLVideoElement>();
/** Elements whose failure pause has not reported its native events yet. */
const failurePauses = new WeakSet<HTMLVideoElement>();

/** `mediaReadyState` 0 means the failure happened before media data loaded. */
export function createNativeErrorPayload(
  video: HTMLVideoElement,
  code: number,
  message: string
): VibePlayerAdapterEvent["payload"] {
  return {
    code,
    fatal: true,
    kind: mediaErrorKinds[code] ?? "unknown",
    mediaReadyState: video.readyState,
    message,
    network: code === 2,
  };
}

export function hasNativeSourceFailure(video: HTMLVideoElement): boolean {
  return failedSourceLists.has(video);
}

export function resetNativeSourceFailure(video: HTMLVideoElement): void {
  failedSourceLists.delete(video);
  failurePauses.delete(video);
}

/**
 * The pause that settles a pending `play()` after every source failed is not
 * a viewer pause: hosts already received the fatal error, as on the
 * MediaError path, which pauses nothing. Its `timeupdate` and `pause` are
 * swallowed; the `pause` ends the window.
 */
export function isNativeFailurePauseEvent(
  video: HTMLVideoElement,
  nativeEvent: string
): boolean {
  if (!failurePauses.has(video)) {
    return false;
  }
  if (nativeEvent === "pause") {
    failurePauses.delete(video);
    return true;
  }
  return nativeEvent === "timeupdate";
}

/**
 * Failed `<source>` candidates report on themselves while the element keeps
 * waiting for another one, so the last failure is the fatal one.
 */
export function bindNativeSourceFailure(
  video: HTMLVideoElement,
  emit: NativeErrorEmitter
): () => void {
  const listener = ({ target }: Event) => {
    if (
      !(target instanceof HTMLSourceElement) ||
      video.querySelector("source:last-of-type") !== target
    ) {
      return;
    }
    failedSourceLists.add(video);
    emit(
      "error",
      createNativeErrorPayload(video, 4, "No media source could be loaded.")
    );
    // A pending play() would otherwise wait for another source forever.
    if (!video.paused) {
      failurePauses.add(video);
      video.pause();
    }
  };
  video.addEventListener("error", listener, true);
  return () => video.removeEventListener("error", listener, true);
}
