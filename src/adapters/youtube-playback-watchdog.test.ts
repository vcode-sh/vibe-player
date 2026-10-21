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

  it("reports a stalled intent once, only after its full grace period", () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    watchdog.completeIfAdvanced(10);
    vi.advanceTimersByTime(2499);
    expect(events).toEqual([]);
    watchdog.ensureScheduled();
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["playblocked"]);
    vi.advanceTimersByTime(2500);
    expect(events).toEqual(["playblocked"]);
  });

  it("does not block playback after real time advancement", () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    watchdog.completeIfAdvanced(10.2);
    watchdog.ensureScheduled();
    vi.advanceTimersByTime(2500);

    expect(events).toEqual([]);
  });

  it("gives a new play intent a new deadline without firing the old one", () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    vi.advanceTimersByTime(2000);
    watchdog.begin(30);
    vi.advanceTimersByTime(500);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["playblocked"]);
  });

  it("cancels a user-abandoned intent even when buffering tries to reschedule", () => {
    vi.useFakeTimers();
    const { events, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    watchdog.cancelIntent();
    watchdog.ensureScheduled();
    vi.advanceTimersByTime(2500);

    expect(events).toEqual([]);
  });

  it("does not report a playback failure after the provider disappears", () => {
    vi.useFakeTimers();
    const { events, setHasPlayer, watchdog } = createWatchdogProbe();

    watchdog.begin(10);
    setHasPlayer(false);
    vi.advanceTimersByTime(2500);

    expect(events).toEqual([]);
  });
});
