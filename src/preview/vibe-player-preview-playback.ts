const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
interface PreviewPlaybackOwner {
  shouldPlay: () => boolean;
}

// A late play completion must follow the newest binding of a reused video.
const playbackOwners = new WeakMap<HTMLVideoElement, PreviewPlaybackOwner>();

/** Owns visibility, motion preference and late playback work for one loop. */
export function bindVibePlayerPreviewPlayback(
  video: HTMLVideoElement,
  paused: boolean
): () => void {
  const motion = window.matchMedia(reducedMotionQuery);
  let active = true;
  let intersecting = true;
  const shouldPlay = () => active && !paused && !motion.matches && intersecting;
  const owner = { shouldPlay };
  playbackOwners.set(video, owner);
  const synchronize = () => {
    if (!active) {
      return;
    }
    if (!shouldPlay()) {
      video.pause();
      return;
    }
    requestPreviewPlayback(video, owner);
  };
  const observer = createVisibilityObserver((visible) => {
    if (active) {
      intersecting = visible;
      synchronize();
    }
  });
  motion.addEventListener("change", synchronize);
  observer?.observe(video);
  synchronize();
  return () => {
    active = false;
    observer?.disconnect();
    motion.removeEventListener("change", synchronize);
    if (playbackOwners.get(video) === owner) {
      playbackOwners.delete(video);
      if (!video.paused) {
        video.pause();
      }
    }
  };
}

function requestPreviewPlayback(
  video: HTMLVideoElement,
  owner: PreviewPlaybackOwner
): void {
  video
    .play()
    .then(() => {
      const currentOwner = playbackOwners.get(video) ?? owner;
      if (!currentOwner.shouldPlay()) {
        video.pause();
      }
    })
    .catch(() => {
      // Preview autoplay is best-effort; the poster remains usable.
    });
}

function createVisibilityObserver(
  onVisibility: (visible: boolean) => void
): IntersectionObserver | null {
  if (typeof window.IntersectionObserver === "undefined") {
    return null;
  }
  return new window.IntersectionObserver((entries) => {
    const [entry] = entries;
    if (entry) {
      onVisibility(entry.isIntersecting);
    }
  });
}
