import { vi } from "vitest";

const nativeIntersectionObserver = globalThis.IntersectionObserver;
const nativeMatchMedia = window.matchMedia;
const nativePause = window.HTMLMediaElement.prototype.pause;
const nativePlay = window.HTMLMediaElement.prototype.play;

export const pauseMock = vi.fn(() => undefined);
export const playMock = vi.fn(() => Promise.resolve());

export const previewSource = {
  id: "preview-one",
  posterUrl: "/poster.webp",
  previewVideoUrl: "/loop.mp4",
};

export function getPoster(container: HTMLElement, url: string): HTMLElement {
  const posters = Array.from(
    container.querySelectorAll(".vibe-player-background-preview__poster")
  );
  const poster = posters.find((element) =>
    element.getAttribute("style")?.includes(url)
  );
  if (!(poster instanceof HTMLElement)) {
    throw new Error(`Expected preview poster for ${url}.`);
  }
  return poster;
}

export function getVideo(
  container: HTMLElement,
  src: string
): HTMLVideoElement {
  const video = container.querySelector(`video[src="${src}"]`);
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error(`Expected preview video for ${src}.`);
  }
  return video;
}

export function installMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches,
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
  });
}

export function installPreviewBrowserMocks(): void {
  installMediaMocks();
  installMatchMedia(false);
  removeIntersectionObserver();
  pauseMock.mockClear();
  playMock.mockClear();
}

export function restorePreviewBrowserMocks(): void {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: nativeIntersectionObserver,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: nativeMatchMedia,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: nativePause,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: nativePlay,
  });
}

function installMediaMocks(): void {
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: pauseMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: playMock,
  });
}

function removeIntersectionObserver(): void {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: undefined,
  });
}
