import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerAmbientPreview } from "./vibe-player-ambient-preview";
import { VibePlayerBackgroundPreview } from "./vibe-player-background-preview";
import {
  getVideo,
  installMatchMedia,
  installPreviewBrowserMocks,
  pauseMock,
  playMock,
  previewSource,
  restorePreviewBrowserMocks,
} from "./vibe-player-background-preview-test-helpers";

const nextSource = {
  id: "preview-two",
  posterUrl: "/poster-two.webp",
  previewVideoUrl: "/loop-two.mp4",
};

describe("VibePlayerBackgroundPreview", () => {
  beforeEach(() => {
    installPreviewBrowserMocks();
  });

  afterEach(() => {
    cleanup();
    restorePreviewBrowserMocks();
    vi.useRealTimers();
  });

  it("requests playback of a muted inline loop without exposing decorative media", () => {
    const { container } = render(
      <VibePlayerBackgroundPreview source={previewSource} />
    );
    const video = getVideo(container, "/loop.mp4");

    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("aria-hidden", "true");
    expect(playMock.mock.contexts).toEqual([video]);
    expect(pauseMock).not.toHaveBeenCalled();
  });

  it("pauses the current loop and resumes it only after the consumer releases pause", () => {
    const { container, rerender } = render(
      <VibePlayerBackgroundPreview source={previewSource} />
    );
    const video = getVideo(container, "/loop.mp4");

    rerender(<VibePlayerBackgroundPreview paused source={previewSource} />);
    expect(pauseMock.mock.contexts).toEqual([video]);
    expect(playMock.mock.contexts).toEqual([video]);

    rerender(<VibePlayerBackgroundPreview source={previewSource} />);
    expect(playMock.mock.contexts).toEqual([video, video]);
    expect(pauseMock.mock.contexts).toEqual([video]);
  });

  it("retains the previous loop until the replacement has a frame, then retires it", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <VibePlayerBackgroundPreview source={previewSource} />
    );
    const firstVideo = getVideo(container, "/loop.mp4");
    fireEvent.loadedData(firstVideo);
    act(() => vi.advanceTimersByTime(500));

    rerender(<VibePlayerBackgroundPreview source={nextSource} />);
    const nextVideo = getVideo(container, "/loop-two.mp4");
    act(() => vi.advanceTimersByTime(500));
    expect(firstVideo).toBeInTheDocument();
    expect(nextVideo).toBeInTheDocument();

    fireEvent.loadedData(nextVideo);
    act(() => vi.advanceTimersByTime(500));
    expect(firstVideo).not.toBeInTheDocument();
    expect(nextVideo).toBeInTheDocument();
  });

  it("replaces changed preview assets even when the consumer keeps the source id", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <VibePlayerBackgroundPreview source={previewSource} />
    );
    const original = getVideo(container, "/loop.mp4");
    fireEvent.loadedData(original);
    act(() => vi.advanceTimersByTime(300));

    rerender(
      <VibePlayerBackgroundPreview
        source={{ ...previewSource, previewVideoUrl: "/replacement.mp4" }}
      />
    );
    const replacement = getVideo(container, "/replacement.mp4");
    expect(original).toBeInTheDocument();
    fireEvent.loadedData(replacement);
    act(() => vi.advanceTimersByTime(300));
    expect(original).not.toBeInTheDocument();
    expect(replacement).toBeInTheDocument();
  });

  it("does not inherit another preview when no preserve key is supplied", () => {
    const first = render(
      <VibePlayerBackgroundPreview
        preservePreviousLayer
        source={previewSource}
      />
    );
    first.unmount();

    const { container } = render(
      <VibePlayerBackgroundPreview preservePreviousLayer source={nextSource} />
    );

    expect(container.querySelector('video[src="/loop.mp4"]')).toBeNull();
    expect(getVideo(container, "/loop-two.mp4")).toBeInTheDocument();
  });

  it("preserves across matching keys while keeping unrelated previews isolated", () => {
    const preserveKey = "preview-cache-isolation";
    const first = render(
      <VibePlayerBackgroundPreview
        preserveKey={preserveKey}
        preservePreviousLayer
        source={previewSource}
      />
    );
    first.unmount();

    const unrelated = render(
      <VibePlayerBackgroundPreview
        preserveKey="unrelated-preview"
        preservePreviousLayer
        source={nextSource}
      />
    );
    expect(
      unrelated.container.querySelector('video[src="/loop.mp4"]')
    ).toBeNull();
    unrelated.unmount();

    const { container } = render(
      <VibePlayerBackgroundPreview
        preserveKey={preserveKey}
        preservePreviousLayer
        source={nextSource}
      />
    );
    expect(getVideo(container, "/loop.mp4")).toBeInTheDocument();
    expect(getVideo(container, "/loop-two.mp4")).toBeInTheDocument();
  });

  it("never requests playback for reduced-motion viewers, including after pause release", () => {
    installMatchMedia(true);
    const { container, rerender } = render(
      <VibePlayerBackgroundPreview paused source={previewSource} />
    );
    const video = getVideo(container, "/loop.mp4");

    rerender(<VibePlayerBackgroundPreview source={previewSource} />);

    expect(pauseMock.mock.contexts).toEqual([video, video]);
    expect(playMock).not.toHaveBeenCalled();
  });
});

describe("VibePlayerAmbientPreview", () => {
  afterEach(cleanup);

  it("exposes an activation button only when the consumer provides an action", () => {
    const onActivate = vi.fn();
    const { rerender } = render(
      <VibePlayerAmbientPreview
        activateLabel="Open preview video"
        onActivate={onActivate}
        source={{ posterUrl: "/poster.webp" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open preview video" }));
    expect(onActivate).toHaveBeenCalledTimes(1);

    rerender(
      <VibePlayerAmbientPreview
        activateLabel="Open preview video"
        source={{ posterUrl: "/poster.webp" }}
      />
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
