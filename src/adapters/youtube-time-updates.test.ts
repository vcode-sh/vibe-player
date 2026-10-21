import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeTimeUpdates } from "./youtube-time-updates";

describe("YouTubeTimeUpdates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("samples once per interval even when playback repeatedly reports playing", () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();
    const timeUpdates = new YouTubeTimeUpdates({ onTimeUpdate });

    timeUpdates.start();
    vi.advanceTimersByTime(499);
    expect(onTimeUpdate).not.toHaveBeenCalled();
    timeUpdates.start();
    vi.advanceTimersByTime(1);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(onTimeUpdate).toHaveBeenCalledTimes(2);
    timeUpdates.stop();
  });

  it("stops sampling and starts a fresh interval when playback resumes", () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();
    const timeUpdates = new YouTubeTimeUpdates({ onTimeUpdate });

    timeUpdates.start();
    vi.advanceTimersByTime(500);
    timeUpdates.stop();
    timeUpdates.stop();
    vi.advanceTimersByTime(1000);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
    timeUpdates.start();
    vi.advanceTimersByTime(499);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(onTimeUpdate).toHaveBeenCalledTimes(2);
    timeUpdates.stop();
  });
});
