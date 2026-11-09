import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { stubPlayerIntersections } from "./vibe-player-visibility-test-helpers";

describe("explicit Play below the visibility threshold", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("plays a mostly hidden player until it next leaves view", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new TestAdapter();
    const adapterFactory = () => adapter;
    const { result, unmount } = renderHook(() =>
      useVibePlayer({ adapterFactory, source: fileSource })
    );
    act(() => result.current.setTarget(document.createElement("div")));
    // A feed card only 10 % in view: below the 25 % threshold.
    await act(async () => intersections.emit(0.1));

    await act(() => result.current.controller.play());
    act(() => adapter.emit("play", { paused: false, readyState: "playing" }));
    expect(result.current.state.snapshot.readyState).toBe("playing");
    expect(adapter.calls).not.toContain("unmount");

    // Scrolling it out of view again still releases it.
    await act(async () => intersections.emit(0));
    expect(result.current.state.snapshot.readyState).toBe("idle");
    expect(adapter.calls).toContain("unmount");
    unmount();
  });
});
