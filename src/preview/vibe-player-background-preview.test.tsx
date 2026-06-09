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
import {
  getPoster,
  getVideo,
  installMatchMedia,
  installPreviewBrowserMocks,
  pauseMock,
  playMock,
  previewSource,
  restorePreviewBrowserMocks,
} from "./vibe-player-background-preview-test-helpers";

describe("VibePlayerBackgroundPreview", () => {
  beforeEach(() => {
    installPreviewBrowserMocks();
  });

  afterEach(() => {
    cleanup();
    restorePreviewBrowserMocks();
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

  it("does not preserve a separate preview without an explicit preserve key", () => {
    const first = render(
      <VibePlayerBackgroundPreview
        preservePreviousLayer
        source={previewSource}
      />
    );
    first.unmount();

    const { container } = render(
      <VibePlayerBackgroundPreview
        preservePreviousLayer
        source={{
          id: "preview-two",
          posterUrl: "/poster-two.webp",
          previewVideoUrl: "/loop-two.mp4",
        }}
      />
    );

    expect(container.querySelector('video[src="/loop.mp4"]')).toBeNull();
    expect(getVideo(container, "/loop-two.mp4")).toBeInTheDocument();
  });

  it("preserves a previous preview across remounts with a shared preserve key", () => {
    const first = render(
      <VibePlayerBackgroundPreview
        preserveKey="hero-preview"
        preservePreviousLayer
        source={previewSource}
      />
    );
    first.unmount();

    const { container } = render(
      <VibePlayerBackgroundPreview
        preserveKey="hero-preview"
        preservePreviousLayer
        source={{
          id: "preview-two",
          posterUrl: "/poster-two.webp",
          previewVideoUrl: "/loop-two.mp4",
        }}
      />
    );

    const previousVideo = getVideo(container, "/loop.mp4");
    const nextVideo = getVideo(container, "/loop-two.mp4");
    const previousPoster = getPoster(container, "/poster.webp");
    expect(previousPoster.dataset.visible).toBe("true");
    expect(previousVideo).toBeInTheDocument();
    expect(nextVideo.dataset.visible).toBe("false");
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
