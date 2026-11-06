import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import type { VibePlayerSource } from "../core/vibe-player-types";
import {
  type UseVibePlayerControllerOptions,
  useVibePlayerController,
} from "./use-vibe-player-controller";

describe("live controller integrations", () => {
  it("accepts an updated renewal callback without replacing a lazy session", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const renewed: VibePlayerSource = {
      ...fileSource,
      expiresAt: Number.MAX_SAFE_INTEGER,
      sources: [{ mimeType: "video/mp4", url: "/renewed.mp4" }],
    };
    const renewSource = vi.fn(async () => renewed);
    const onRenew = vi.fn();
    const { result, rerender, unmount } = renderHook(
      (options: UseVibePlayerControllerOptions) =>
        useVibePlayerController(options),
      { initialProps: { adapterFactory } as UseVibePlayerControllerOptions }
    );
    const { controller } = result.current;
    await act(() => controller.load({ ...fileSource, expiresAt: 0 }, "onPlay"));
    expect(adapterFactory).not.toHaveBeenCalled();

    rerender({ adapterFactory, onRenew, renewSource });
    await act(() => controller.play());

    expect(result.current.controller).toBe(controller);
    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(onRenew).toHaveBeenCalledWith(renewed);
    expect(result.current.state.currentSource).toEqual(renewed);
    expect(adapter.calls).toContain("play");
    unmount();
  });

  it("sends normalized events and pause state to current callbacks during playback", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = () => adapter;
    const previousEvent = vi.fn();
    const previousPause = vi.fn();
    const latestEvent = vi.fn();
    const latestPause = vi.fn();
    const { result, rerender, unmount } = renderHook(
      (options: UseVibePlayerControllerOptions) =>
        useVibePlayerController(options),
      {
        initialProps: {
          adapterFactory,
          onEvent: previousEvent,
          onPause: previousPause,
        },
      }
    );
    const { controller } = result.current;
    await act(() => controller.load(fileSource));
    act(() => adapter.emit("play", { paused: false, readyState: "playing" }));
    previousEvent.mockClear();
    rerender({ adapterFactory, onEvent: latestEvent, onPause: latestPause });

    act(() => adapter.emit("pause", { currentTime: 27, paused: true }));
    expect(result.current.controller).toBe(controller);
    expect(previousEvent).not.toHaveBeenCalled();
    expect(previousPause).not.toHaveBeenCalled();
    expect(latestEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ currentTime: 27 }),
        type: "pause",
      })
    );
    expect(latestPause).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ currentTime: 27, paused: true }),
      })
    );
    expect(adapter.calls).not.toContain("unmount");
    unmount();
  });
});
