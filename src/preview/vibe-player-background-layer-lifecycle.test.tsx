import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerBackgroundLayer } from "./vibe-player-background-layer";
import {
  installPreviewBrowserMocks,
  pauseMock,
  playMock,
  restorePreviewBrowserMocks,
} from "./vibe-player-background-preview-test-helpers";
import {
  PreviewMotionQuery,
  PreviewVisibilityObserver,
} from "./vibe-player-preview-playback-test-helpers";

const layer = {
  id: "observed-preview",
  onFrameReady: () => undefined,
  posterUrl: "/poster.webp",
  previewVideoUrl: "/preview.mp4",
  visible: true,
};

function installVisibility() {
  const observers: PreviewVisibilityObserver[] = [];
  class Observer extends PreviewVisibilityObserver {
    constructor(callback: IntersectionObserverCallback) {
      super(callback);
      observers.push(this);
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return () => {
    const observer = observers.at(-1);
    if (!observer) {
      throw new Error("Expected preview visibility observation.");
    }
    return observer;
  };
}

describe("ambient preview lifecycle", () => {
  beforeEach(installPreviewBrowserMocks);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    restorePreviewBrowserMocks();
  });

  it("ignores queued visibility work after pause and unmount while current visibility still works", () => {
    const currentObserver = installVisibility();
    const { rerender, unmount } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    const obsolete = currentObserver();
    act(() => obsolete.deliver(false));
    act(() => obsolete.deliver(true));
    expect(playMock).toHaveBeenCalledTimes(2);
    expect(pauseMock).toHaveBeenCalledTimes(1);

    rerender(<VibePlayerBackgroundLayer {...layer} paused />);
    playMock.mockClear();
    act(() => obsolete.deliver(true));
    expect(playMock).not.toHaveBeenCalled();
    unmount();
    act(() => currentObserver().deliver(true));
    expect(playMock).not.toHaveBeenCalled();
  });

  it("does not restart a removed loop from a queued visibility callback", () => {
    const currentObserver = installVisibility();
    const { unmount } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    const queued = currentObserver();
    unmount();
    playMock.mockClear();
    act(() => queued.deliver(true));
    expect(playMock).not.toHaveBeenCalled();
  });

  it("reacts to motion preference changes without restarting an offscreen or host-paused loop", () => {
    const motion = new PreviewMotionQuery();
    vi.spyOn(window, "matchMedia").mockReturnValue(motion);
    const currentObserver = installVisibility();
    const { rerender } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    expect(playMock).toHaveBeenCalledTimes(1);
    act(() => motion.setMatches(true));
    expect(pauseMock).toHaveBeenCalledTimes(1);
    act(() => currentObserver().deliver(false));
    act(() => motion.setMatches(false));
    expect(playMock).toHaveBeenCalledTimes(1);
    act(() => currentObserver().deliver(true));
    expect(playMock).toHaveBeenCalledTimes(2);

    rerender(<VibePlayerBackgroundLayer {...layer} paused />);
    playMock.mockClear();
    act(() => motion.setMatches(true));
    act(() => motion.setMatches(false));
    expect(playMock).not.toHaveBeenCalled();
  });

  it("pauses a pending playback start that resolves after disposal", async () => {
    let resolve: () => void = () => undefined;
    const pending = new Promise<void>((complete) => {
      resolve = complete;
    });
    playMock.mockImplementationOnce(() => pending);
    const { container, unmount } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    const video = container.querySelector("video");
    unmount();
    pauseMock.mockClear();
    await act(async () => {
      resolve();
      await pending;
    });
    expect(pauseMock.mock.contexts).toContain(video);
  });
  it("keeps a host pause when an earlier playback request resolves late", async () => {
    let complete: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      complete = resolve;
    });
    playMock.mockImplementationOnce(() => pending);
    const { container, rerender } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    const video = container.querySelector("video");
    rerender(<VibePlayerBackgroundLayer {...layer} paused />);
    pauseMock.mockClear();
    await act(async () => {
      complete();
      await pending;
    });
    expect(pauseMock.mock.contexts).toContain(video);
  });

  it("does not let an obsolete play completion pause a newer playback owner", async () => {
    let complete: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      complete = resolve;
    });
    playMock.mockImplementationOnce(() => pending);
    const { rerender } = render(
      <VibePlayerBackgroundLayer {...layer} paused={false} />
    );
    rerender(<VibePlayerBackgroundLayer {...layer} paused />);
    await act(async () =>
      rerender(<VibePlayerBackgroundLayer {...layer} paused={false} />)
    );
    expect(playMock).toHaveBeenCalledTimes(2);
    pauseMock.mockClear();
    await act(async () => {
      complete();
      await pending;
    });
    expect(pauseMock).not.toHaveBeenCalled();
  });
});
