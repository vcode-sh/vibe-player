import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubePlaybackWatchdog } from "./youtube-playback-watchdog";

function createWatchdogProbe() {
  const events: string[] = [];
  let hasPlayer = true;
  const watchdog = new YouTubePlaybackWatchdog({
    emitPlayBlocked: () => {
      events.push("playblocked");
    },
    hasPlayer: () => hasPlayer,
  });
  return {
    events,
    setHasPlayer: (value: boolean) => {
      hasPlayer = value;
    },
    watchdog,
  };
}

describe("YouTubePlaybackWatchdog", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks playback when a start intent never advances time", async () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    await vi.advanceTimersByTimeAsync(2500);

    expect(events).toEqual(["playblocked"]);
  });

  it("does not block playback after real time advancement", async () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    watchdog.completeIfAdvanced(10.2);
    await vi.advanceTimersByTimeAsync(2500);

    expect(events).toEqual([]);
  });
});
