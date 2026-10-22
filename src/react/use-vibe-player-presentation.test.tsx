import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";

describe("headless presentation ownership", () => {
  it("changes fullscreen container without reloading or disposing active media", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const mount = vi.spyOn(adapter, "mount");
    const media = document.createElement("div");
    const first = document.createElement("section");
    const second = document.createElement("article");
    const { result, rerender, unmount } = renderHook(
      ({ presentationTarget }) =>
        useVibePlayer({
          adapterFactory,
          presentationTarget,
          source: fileSource,
        }),
      { initialProps: { presentationTarget: first } }
    );
    act(() => result.current.setTarget(media));
    await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
    act(() =>
      adapter.emit("play", {
        currentTime: 23,
        paused: false,
        readyState: "playing",
      })
    );
    expect(mount).toHaveBeenLastCalledWith(media, first);

    rerender({ presentationTarget: second });

    expect(mount).toHaveBeenLastCalledWith(media, second);
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls).not.toContain("unmount");
    expect(result.current.state.snapshot).toMatchObject({
      currentTime: 23,
      paused: false,
    });
    unmount();
  });
});
