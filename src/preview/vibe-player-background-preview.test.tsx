import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerAmbientPreview } from "./vibe-player-ambient-preview";
import { VibePlayerBackgroundPreview } from "./vibe-player-background-preview";

const nativeIntersectionObserver = globalThis.IntersectionObserver;
const nativeMatchMedia = window.matchMedia;
const nativePause = window.HTMLMediaElement.prototype.pause;
const nativePlay = window.HTMLMediaElement.prototype.play;

const pauseMock = vi.fn(() => undefined);
const playMock = vi.fn(() => Promise.resolve());

const previewSource = {
  id: "preview-one",
  posterUrl: "/poster.webp",
  previewVideoUrl: "/loop.mp4",
};

function installMatchMedia(matches: boolean): void {
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

function restoreBrowserGlobals(): void {
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

function getVideo(container: HTMLElement, src: string): HTMLVideoElement {
  const video = container.querySelector(`video[src="${src}"]`);
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error(`Expected preview video for ${src}.`);
  }
  return video;
}

describe("VibePlayerBackgroundPreview", () => {
  beforeEach(() => {
    installMediaMocks();
    installMatchMedia(false);
    removeIntersectionObserver();
    pauseMock.mockClear();
    playMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    restoreBrowserGlobals();
  });

  it("plays muted loop previews best-effort when motion is allowed", async () => {
    render(<VibePlayerBackgroundPreview source={previewSource} />);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(pauseMock).not.toHaveBeenCalled();
  });

  it("keeps poster fallback and reveals video after the first frame", async () => {
    const { container } = render(
      <VibePlayerBackgroundPreview
        source={{
          ...previewSource,
          fallbackPosterUrl: "/fallback.webp",
          posterUrl: "/background.webp",
        }}
      />
    );
    const poster = container.querySelector(
      ".vibe-player-background-preview__poster"
    );
    const video = getVideo(container, "/loop.mp4");

    expect(poster?.getAttribute("style")).toContain(
      'url("/background.webp"), url("/fallback.webp")'
    );
    expect(poster?.getAttribute("data-visible")).toBe("true");
    expect(video.dataset.visible).toBe("false");

    fireEvent.loadedData(video);

    await waitFor(() => expect(video.dataset.visible).toBe("true"));
  });

  it("keeps the previous loop visible until the next loop has a frame", async () => {
    const { container, rerender } = render(
      <VibePlayerBackgroundPreview source={previewSource} />
    );
    const firstVideo = getVideo(container, "/loop.mp4");
    fireEvent.loadedData(firstVideo);
    await waitFor(() => expect(firstVideo.dataset.visible).toBe("true"));

    rerender(
      <VibePlayerBackgroundPreview
        source={{
          id: "preview-two",
          posterUrl: "/poster-two.webp",
          previewVideoUrl: "/loop-two.mp4",
        }}
      />
    );

    await waitFor(() =>
      expect(container.querySelectorAll("video")).toHaveLength(2)
    );
    const nextVideo = getVideo(container, "/loop-two.mp4");
    expect(firstVideo.dataset.visible).toBe("true");
    expect(nextVideo.dataset.visible).toBe("false");

    fireEvent.loadedData(nextVideo);

    await waitFor(() => expect(nextVideo.dataset.visible).toBe("true"));
  });

  it("pauses preview video for reduced-motion viewers", async () => {
    installMatchMedia(true);

    render(<VibePlayerBackgroundPreview source={previewSource} />);

    await waitFor(() => expect(pauseMock).toHaveBeenCalledTimes(1));
    expect(playMock).not.toHaveBeenCalled();
  });
});

describe("VibePlayerAmbientPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("supports preview-to-player handoff without owning the player", () => {
    const onActivate = vi.fn();
    render(
      <VibePlayerAmbientPreview
        activateLabel="Open preview video"
        onActivate={onActivate}
        source={{ posterUrl: "/poster.webp" }}
      >
        <span>Preview copy</span>
      </VibePlayerAmbientPreview>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open preview video" }));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Preview copy")).toBeInTheDocument();
  });
});
