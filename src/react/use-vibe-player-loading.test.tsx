import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";

describe("headless loading policy", () => {
  it("does not create an engine before Play with onPlay loading", async () => {
    const adapter = new TestAdapter();
    const adapterFactory = vi.fn(() => adapter);
    const { result, unmount } = renderHook(() =>
      useVibePlayer({ adapterFactory, load: "onPlay", source: fileSource })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    await waitFor(() =>
      expect(result.current.state.currentSource?.id).toBe("video-1")
    );
    expect(adapterFactory).not.toHaveBeenCalled();
    expect(result.current.state.snapshot.readyState).toBe("idle");

    await act(() => result.current.controller.play());
    expect(adapterFactory).toHaveBeenCalledTimes(1);
    expect(adapter.calls).toContain("play");
    unmount();
  });
});
