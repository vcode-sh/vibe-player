import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVibePlayerOverlayPresence } from "./use-vibe-player-overlay-presence";

describe("useVibePlayerOverlayPresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the overlay rendered while closing", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useVibePlayerOverlayPresence(open, 180),
      { initialProps: { open: true } }
    );

    expect(result.current).toEqual({ rendered: true, state: "open" });
    rerender({ open: false });
    expect(result.current).toEqual({ rendered: true, state: "closing" });

    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(result.current.rendered).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual({ rendered: false, state: "closing" });
  });
});
