import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayerController } from "./use-vibe-player-controller";

// Callback updates must not interrupt a source that is already playing.
describe("controller callback updates", () => {
  it("keeps playback and sends subsequent analytics to the latest callback", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = () => adapter;
    const previous = vi.fn();
    const latest = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ onAnalyticsEvent }) =>
        useVibePlayerController({ adapterFactory, onAnalyticsEvent }),
      { initialProps: { onAnalyticsEvent: previous } }
    );
    const { controller } = result.current;
    await act(() => controller.load(fileSource));
    act(() =>
      adapter.emit("timeupdate", {
        currentTime: 17,
        paused: false,
        readyState: "playing",
      })
    );
    previous.mockClear();

    rerender({ onAnalyticsEvent: latest });
    act(() => adapter.emit("ended", { currentTime: 100, readyState: "ended" }));

    expect(result.current.controller).toBe(controller);
    expect(result.current.state.snapshot.currentTime).toBe(100);
    expect(adapter.calls).not.toContain("unmount");
    expect(previous).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: "video-1", type: "completed" })
    );
    unmount();
  });
});
