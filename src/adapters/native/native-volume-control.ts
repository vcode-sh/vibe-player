const volumeControl = new WeakMap<HTMLVideoElement, boolean>();

/**
 * Detects read-only volume (iPhone Safari leaves it to the hardware buttons)
 * by writing and reading back. A detached probe element takes the write, so
 * the mounted media keeps its volume and never queues a `volumechange`.
 */
function detectNativeVolumeControl(video: HTMLVideoElement): boolean {
  const probe = video.ownerDocument.createElement("video");
  const expected = probe.volume > 0.5 ? 0.25 : 0.75;
  try {
    probe.volume = expected;
    return Math.abs(probe.volume - expected) < 0.01;
  } catch {
    return false;
  }
}

/** Records the volume capability once, when media is created for a mount. */
export function observeNativeVolumeControl(video: HTMLVideoElement): void {
  volumeControl.set(video, detectNativeVolumeControl(video));
}

/** Native media always comes from `createNativeVideo`, which observes it. */
export function supportsNativeVolumeControl(video: HTMLVideoElement): boolean {
  return volumeControl.get(video) ?? true;
}
