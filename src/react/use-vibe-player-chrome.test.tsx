import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVibePlayerChrome } from "./use-vibe-player-chrome";

describe("useVibePlayerChrome", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    const remainingTimers = vi.getTimerCount();
    vi.useRealTimers();
    expect(remainingTimers).toBe(0);
  });

  it("restarts the full idle delay after activity instead of using the old deadline", () => {
    const { result } = renderHook(() =>
      useVibePlayerChrome({ idleDelayMs: 1000, open: true })
    );

    expect(result.current.chromeHidden).toBe(false);

    act(() => {
      vi.advanceTimersByTime(600);
      result.current.showChrome();
    });
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.chromeHidden).toBe(false);
    act(() => vi.advanceTimersByTime(599));
    expect(result.current.chromeHidden).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.chromeHidden).toBe(true);
  });

  it("keeps chrome visible while focus is held", () => {
    const { result } = renderHook(() =>
      useVibePlayerChrome({ idleDelayMs: 1000, open: true })
    );

    act(() => {
      result.current.holdChrome();
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.chromeHidden).toBe(false);

    act(() => {
      result.current.releaseChrome();
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.chromeHidden).toBe(true);
  });

  it("keeps controls visible after playback pauses or ends", () => {
    const { result, rerender } = renderHook(
      ({ playing }) =>
        useVibePlayerChrome({ idleDelayMs: 1000, open: true, playing }),
      { initialProps: { playing: true } }
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.chromeHidden).toBe(true);
    rerender({ playing: false });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.chromeHidden).toBe(false);
    rerender({ playing: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.chromeHidden).toBe(true);
  });

  it("cancels a pending hide when disabled and resumes it when enabled", () => {
    const { result, rerender } = renderHook(
      ({ autoHide }) =>
        useVibePlayerChrome({ autoHide, idleDelayMs: 1000, open: true }),
      { initialProps: { autoHide: true } }
    );
    act(() => vi.advanceTimersByTime(600));
    rerender({ autoHide: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.chromeHidden).toBe(false);
    rerender({ autoHide: true });
    act(() => vi.advanceTimersByTime(999));
    expect(result.current.chromeHidden).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.chromeHidden).toBe(true);
  });

  it("resets chrome and clears timers when closed", () => {
    const { result, rerender } = renderHook(
      ({ open }) => useVibePlayerChrome({ idleDelayMs: 1000, open }),
      { initialProps: { open: true } }
    );

    act(() => vi.advanceTimersByTime(600));
    rerender({ open: false });
    expect(result.current.chromeHidden).toBe(false);

    act(() => {
      result.current.releaseChrome();
      result.current.showChrome();
      result.current.scheduleChromeHide();
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.chromeHidden).toBe(false);
    rerender({ open: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.chromeHidden).toBe(true);
    rerender({ open: false });
    expect(result.current.chromeHidden).toBe(false);
  });
});
