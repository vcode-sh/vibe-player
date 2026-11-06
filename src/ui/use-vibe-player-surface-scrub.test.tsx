import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type UseVibePlayerSurfaceScrubInput,
  useVibePlayerSurfaceScrub,
} from "./use-vibe-player-surface-scrub";

afterEach(() => {
  vi.useRealTimers();
});

function setup(currentTime = 10) {
  const seekTo = vi.fn();
  const hold = vi.fn();
  const release = vi.fn();
  const input: UseVibePlayerSurfaceScrubInput = {
    currentTime,
    duration: 60,
    hold,
    release,
    seekTo,
  };
  const hook = renderHook((props) => useVibePlayerSurfaceScrub(props), {
    initialProps: input,
  });
  return { hold, hook, input, release, seekTo };
}

describe("surface scrub session", () => {
  it("previews while dragging and seeks once, on release", () => {
    const { hook, seekTo, hold, release } = setup();
    act(() => hook.result.current.scrubStart());
    act(() => hook.result.current.scrubTo(0.25));
    act(() => hook.result.current.scrubTo(0.5));
    expect(hook.result.current.previewTime).toBe(30);
    expect(hook.result.current.scrubbing).toBe(true);
    expect(hold).toHaveBeenCalledOnce();
    expect(seekTo).not.toHaveBeenCalled();
    act(() => hook.result.current.scrubEnd());
    expect(seekTo).toHaveBeenCalledExactlyOnceWith(30);
    expect(release).toHaveBeenCalledOnce();
    expect(hook.result.current.scrubbing).toBe(false);
  });

  it("clamps the preview to the media and can cancel without seeking", () => {
    const { hook, seekTo } = setup();
    act(() => hook.result.current.scrubStart());
    act(() => hook.result.current.scrubTo(1.4));
    expect(hook.result.current.previewTime).toBe(60);
    act(() => hook.result.current.scrubEnd(false));
    expect(seekTo).not.toHaveBeenCalled();
    expect(hook.result.current.previewTime).toBeNull();
  });

  it("keeps the preview until playback reaches it, so time never jumps back", () => {
    const { hook, input } = setup();
    act(() => hook.result.current.scrubStart());
    act(() => hook.result.current.scrubTo(0.5));
    act(() => hook.result.current.scrubEnd());
    hook.rerender({ ...input, currentTime: 10.2 });
    expect(hook.result.current.previewTime).toBe(30);
    hook.rerender({ ...input, currentTime: 30.1 });
    expect(hook.result.current.previewTime).toBeNull();
  });

  it("accumulates keyboard seeks from the preview and shows feedback for 700 ms", () => {
    vi.useFakeTimers();
    const { hook, seekTo, release } = setup();
    act(() => hook.result.current.seekBy(5));
    act(() => hook.result.current.seekBy(5));
    expect(seekTo).toHaveBeenLastCalledWith(20);
    expect(hook.result.current.scrubbing).toBe(true);
    act(() => vi.advanceTimersByTime(699));
    expect(hook.result.current.scrubbing).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(hook.result.current.scrubbing).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });
});
