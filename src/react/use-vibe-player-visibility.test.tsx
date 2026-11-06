import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { stubPlayerIntersections } from "./vibe-player-visibility-test-helpers";

class MutedAutoplayAdapter extends TestAdapter {
  override setMuted(value: boolean): Promise<void> {
    this.emit("volumechange", { muted: value });
    return super.setMuted(value);
  }
}

describe("player visibility lifetime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads at the visibility threshold without playing", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const { result, unmount } = renderHook(() =>
      useVibePlayer({
        adapterFactory,
        load: "visible",
        offscreenThreshold: 0.25,
        source: fileSource,
      })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource).toEqual(fileSource)
    );
    act(() => intersections.emit(0.2));
    expect(adapterFactory).not.toHaveBeenCalled();

    await act(async () => intersections.emit(0.25));
    await waitFor(() =>
      expect(result.current.state.snapshot.readyState).toBe("ready")
    );
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls).not.toContain("play");
    unmount();
  });

  it("releases offscreen playback and waits for Play after returning", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const { result, unmount } = renderHook(() =>
      useVibePlayer({ adapterFactory, load: "onPlay", source: fileSource })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await act(() => result.current.controller.play());
    act(() =>
      adapter.emit("play", {
        currentTime: 19,
        paused: false,
        readyState: "playing",
      })
    );
    await act(async () => intersections.emit(0.1));
    expect(result.current.state.snapshot).toMatchObject({
      currentTime: 19,
      paused: true,
      readyState: "idle",
    });
    expect(adapter.calls).toContain("unmount");

    act(() => intersections.emit(0.9));
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls.filter((call) => call === "play")).toHaveLength(1);

    adapter.calls.length = 0;
    await act(() => result.current.controller.play());
    expect(adapterFactory).toHaveBeenCalledTimes(2);
    expect(adapter.calls).toContain("seek:19");
    expect(adapter.calls.indexOf("seek:19")).toBeLessThan(
      adapter.calls.indexOf("play")
    );
    unmount();
  });

  it("shares one observer across players and keeps it working when one leaves", async () => {
    const intersections = stubPlayerIntersections();
    const adapters = [new TestAdapter(), new TestAdapter()];
    const players = adapters.map((adapter) => {
      const adapterFactory = () => adapter;
      return renderHook(() =>
        useVibePlayer({ adapterFactory, load: "onPlay", source: fileSource })
      );
    });
    for (const player of players) {
      act(() => player.result.current.setTarget(document.createElement("div")));
    }
    expect(intersections.activeObservers()).toBe(1);
    const [first, second] = players;
    if (!(first && second)) {
      throw new Error("Missing players.");
    }
    await act(() => second.result.current.controller.play());
    first.unmount();
    expect(intersections.activeObservers()).toBe(1);

    await act(async () => intersections.emit(0));
    expect(second.result.current.state.snapshot.readyState).toBe("idle");
    expect(adapters[1]?.calls).toContain("unmount");
    second.unmount();
    expect(intersections.activeObservers()).toBe(0);
  });

  it("releases hidden playback without resuming when the tab returns", async () => {
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility
    );
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const { result, unmount } = renderHook(() =>
      useVibePlayer({ adapterFactory, source: fileSource })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.snapshot.readyState).toBe("ready")
    );
    act(() =>
      adapter.emit("play", {
        currentTime: 31,
        paused: false,
        readyState: "playing",
      })
    );
    visibility = "hidden";
    await act(async () =>
      document.dispatchEvent(new Event("visibilitychange"))
    );
    expect(result.current.state.snapshot).toMatchObject({
      currentTime: 31,
      paused: true,
      readyState: "idle",
    });
    expect(adapter.calls).toContain("unmount");

    visibility = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls).not.toContain("play");
    unmount();
  });

  it("keeps an eager source replacement lazy while the tab is hidden", async () => {
    let visibility: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility
    );
    const adapterFactory = vi.fn(() => new TestAdapter());
    const { result, rerender, unmount } = renderHook(
      ({ source }) => useVibePlayer({ adapterFactory, source }),
      { initialProps: { source: fileSource } }
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource?.id).toBe("video-1")
    );
    rerender({ source: { ...fileSource, id: "next-video" } });
    await waitFor(() =>
      expect(result.current.state.currentSource?.id).toBe("next-video")
    );
    expect(adapterFactory).not.toHaveBeenCalled();

    visibility = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(adapterFactory).not.toHaveBeenCalled();
    await act(() => result.current.controller.play());
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("lets the host disable automatic visibility release", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new TestAdapter();
    const adapterFactory = () => adapter;
    const { result, unmount } = renderHook(() =>
      useVibePlayer({
        adapterFactory,
        pauseWhenHidden: false,
        source: fileSource,
        stopWhenOffscreen: false,
      })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.snapshot.readyState).toBe("ready")
    );
    act(() => adapter.emit("play", { paused: false, readyState: "playing" }));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      intersections.emit(0);
    });
    expect(result.current.state.snapshot.paused).toBe(false);
    expect(adapter.calls).not.toContain("unmount");
    unmount();
  });

  it("autoplays muted only on the first visible entry, including after a host stop", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new MutedAutoplayAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const { result, unmount } = renderHook(() =>
      useVibePlayer({
        adapterFactory,
        autoplayWhenVisible: true,
        load: "onPlay",
        source: fileSource,
      })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource).toEqual(fileSource)
    );
    expect(adapterFactory).not.toHaveBeenCalled();

    await act(async () => intersections.emit(0.9));
    await waitFor(() => expect(adapter.calls).toContain("play"));
    expect(result.current.state.snapshot.muted).toBe(true);
    expect(adapter.calls.indexOf("muted:true")).toBeLessThan(
      adapter.calls.indexOf("play")
    );
    await act(() => result.current.controller.stop());
    act(() => {
      intersections.emit(0);
      intersections.emit(0.9);
    });
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls.filter((call) => call === "play")).toHaveLength(1);
    expect(result.current.state.snapshot.readyState).toBe("idle");
    unmount();
  });
});
