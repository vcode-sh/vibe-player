import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hlsSource } from "../adapters/hls/hls-adapter-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { createHlsLoaderFixture } from "./vibe-player-hls-loader-test-helpers";

describe("inline HLS integration options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps the injected SDK unloaded until Play with the default lazy factory", async () => {
    vi.stubGlobal("MediaSource", class {});
    const fixture = createHlsLoaderFixture();
    const loadHls = vi.fn(fixture.load);
    const video = document.createElement("video");
    document.body.append(video);
    vi.spyOn(video, "play").mockResolvedValue();
    const { result, unmount } = renderHook(() =>
      useVibePlayer({ load: "onPlay", loadHls, source: hlsSource })
    );
    try {
      act(() => result.current.setTarget(video));
      await waitFor(() =>
        expect(result.current.state.currentSource).toEqual(hlsSource)
      );
      expect(loadHls).not.toHaveBeenCalled();
      expect(fixture.engines).toHaveLength(0);
      expect(video.getAttribute("src")).toBeNull();

      await act(() => result.current.controller.play());
      expect(loadHls).toHaveBeenCalledTimes(1);
      expect(fixture.engines[0]?.loads).toEqual([hlsSource.manifestUrl]);
    } finally {
      unmount();
      video.remove();
    }
  });

  it("keeps playing across fresh loader/config props and uses the latest loader next time", async () => {
    vi.stubGlobal("MediaSource", class {});
    const fixture = createHlsLoaderFixture();
    const firstLoader = vi.fn(fixture.load);
    const nextLoader = vi.fn(fixture.load);
    const video = document.createElement("video");
    document.body.append(video);
    let paused = true;
    vi.spyOn(video, "paused", "get").mockImplementation(() => paused);
    vi.spyOn(video, "readyState", "get").mockReturnValue(4);
    vi.spyOn(video, "duration", "get").mockReturnValue(120);
    vi.spyOn(video, "play").mockImplementation(() => {
      paused = false;
      video.dispatchEvent(new Event("play"));
      video.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    });
    vi.spyOn(video, "pause").mockImplementation(() => {
      paused = true;
      video.dispatchEvent(new Event("pause"));
    });
    const { result, rerender, unmount } = renderHook(
      ({ loader, source }) =>
        useVibePlayer({
          hlsConfig: { maxBufferLength: 8 },
          loadHls: () => loader(),
          source,
        }),
      { initialProps: { loader: firstLoader, source: hlsSource } }
    );
    try {
      act(() => result.current.setTarget(video));
      await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
      await act(() => result.current.controller.play());
      act(() => {
        video.currentTime = 29;
        video.dispatchEvent(new Event("timeupdate"));
      });
      const { controller } = result.current;
      rerender({ loader: nextLoader, source: { ...hlsSource } });

      expect(result.current.controller).toBe(controller);
      expect(result.current.state.snapshot).toMatchObject({
        currentTime: 29,
        paused: false,
      });
      expect(fixture.engines).toHaveLength(1);
      expect(fixture.engines[0]?.destroyed).toBe(false);
      expect(nextLoader).not.toHaveBeenCalled();

      rerender({
        loader: nextLoader,
        source: { ...hlsSource, manifestUrl: "/replacement.m3u8" },
      });
      await waitFor(() => expect(nextLoader).toHaveBeenCalledTimes(1));
      expect(firstLoader).toHaveBeenCalledTimes(1);
      expect(fixture.engines[0]?.destroyed).toBe(true);
      expect(fixture.engines[1]?.loads).toEqual(["/replacement.m3u8"]);
    } finally {
      unmount();
      video.remove();
    }
  });
});
