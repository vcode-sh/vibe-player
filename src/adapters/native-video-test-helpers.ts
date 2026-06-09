export interface DeferredPlayback {
  promise: Promise<void>;
  resolve: () => void;
}

export function createDeferredPlayback(): DeferredPlayback {
  let resolvePlayback: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolvePlayback = resolve;
  });
  return {
    promise,
    resolve: () => {
      if (!resolvePlayback) {
        throw new Error("Playback resolver was not initialized.");
      }
      resolvePlayback();
    },
  };
}

export function defineNativeVideoNumberProperty(
  element: HTMLVideoElement,
  key: "duration" | "readyState",
  value: number
): void {
  Object.defineProperty(element, key, {
    configurable: true,
    value,
  });
}

export function getMountedNativeVideo(target: HTMLElement): HTMLVideoElement {
  const video = target.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("Expected mounted video element.");
  }
  return video;
}
