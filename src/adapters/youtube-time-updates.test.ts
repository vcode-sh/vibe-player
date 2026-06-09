import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeTimeUpdates } from "./youtube-time-updates";

describe("YouTubeTimeUpdates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts one sampled timeupdate interval", () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();
    const timeUpdates = new YouTubeTimeUpdates({ onTimeUpdate });

    timeUpdates.start();
    timeUpdates.start();
    vi.advanceTimersByTime(1000);

    expect(onTimeUpdate).toHaveBeenCalledTimes(2);
  });

  it("stops the active sampling interval", () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();
    const timeUpdates = new YouTubeTimeUpdates({ onTimeUpdate });

    timeUpdates.start();
    timeUpdates.stop();
    vi.advanceTimersByTime(1000);

    expect(onTimeUpdate).not.toHaveBeenCalled();
  });
});
