import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapter } from "../core";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { stubPlayerIntersections } from "./vibe-player-visibility-test-helpers";

const viewport = { height: 800, width: 1000 };

/** A player frame whose real box sits `top` px from the viewport top. */
function frameAt(top: number): HTMLElement {
  const frame = document.createElement("div");
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, top, 400, 300)
  );
  return frame;
}

function renderPlayer(
  adapterFactory: () => VibePlayerAdapter | Promise<VibePlayerAdapter>,
  autoPlay = false
) {
  vi.stubGlobal("innerHeight", viewport.height);
  vi.stubGlobal("innerWidth", viewport.width);
  return renderHook(() =>
    useVibePlayer({ adapterFactory, autoPlay, source: fileSource })
  );
}

describe("playback that starts below the visibility threshold", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["a mostly hidden frame (10 % in view)", 770],
    ["a frame the click scrolled into view before its entry arrived", 100],
  ])(
    "keeps an explicit Play on %s until it next leaves view",
    async (_name, top) => {
      const intersections = stubPlayerIntersections();
      const adapter = new TestAdapter();
      const adapterFactory = () => adapter;
      const { result, unmount } = renderPlayer(adapterFactory);
      act(() => result.current.setTarget(frameAt(top)));
      // The last entry reported the frame below the 25 % threshold.
      await act(async () => intersections.emit(0.1));

      await act(() => result.current.controller.play());
      act(() => adapter.emit("play", { paused: false, readyState: "playing" }));
      expect(result.current.state.snapshot.readyState).toBe("playing");
      expect(adapter.calls).not.toContain("unmount");

      // Leaving view again still releases it.
      await act(async () => intersections.emit(0));
      expect(result.current.state.snapshot.readyState).toBe("idle");
      unmount();
    }
  );

  it("releases a start that begins while the frame is fully out of view", async () => {
    const intersections = stubPlayerIntersections();
    const adapter = new TestAdapter();
    let resolveAdapter: (value: VibePlayerAdapter) => void = () => undefined;
    const pending = new Promise<VibePlayerAdapter>((resolve) => {
      resolveAdapter = resolve;
    });
    const adapterFactory = () => pending;
    const { result, unmount } = renderPlayer(adapterFactory, true);
    act(() => result.current.setTarget(frameAt(2000)));
    // The first entry lands before autoplay's adapter has loaded.
    await act(async () => intersections.emit(0));

    await act(async () => resolveAdapter(adapter));
    act(() => adapter.emit("play", { paused: false, readyState: "playing" }));
    await waitFor(() =>
      expect(result.current.state.snapshot.readyState).toBe("idle")
    );
    expect(adapter.calls).toContain("unmount");
    unmount();
  });
});
