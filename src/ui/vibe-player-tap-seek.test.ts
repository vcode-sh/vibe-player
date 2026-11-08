import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createVibePlayerTapSeek,
  getVibePlayerTapSide,
} from "./vibe-player-tap-seek";

const left = 0.1;
const right = 0.9;
const centre = 0.5;

function createHarness() {
  const log: string[] = [];
  const seek = createVibePlayerTapSeek({
    end: () => log.push("end"),
    seek: (side, count) => log.push(`seek ${side * count}`),
  });
  const tap = (fraction: number, name = "single") =>
    seek.tap(fraction, () => log.push(name));
  return { log, seek, tap };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("double-tap seek", () => {
  it("splits the picture into thirds; an unmeasurable tap is the centre", () => {
    expect(getVibePlayerTapSide(0.33)).toBe(-1);
    expect(getVibePlayerTapSide(0.34)).toBe(0);
    expect(getVibePlayerTapSide(0.66)).toBe(0);
    expect(getVibePlayerTapSide(0.67)).toBe(1);
    expect(getVibePlayerTapSide(Number.NaN)).toBe(0);
  });

  it("keeps a centre tap immediate and delays a side tap by 300 ms", () => {
    const { log, tap } = createHarness();
    tap(centre);
    expect(log).toEqual(["single"]);
    tap(left);
    vi.advanceTimersByTime(299);
    expect(log).toEqual(["single"]);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(["single", "single"]);
  });

  it("accumulates a burst on one side, then fades it 700 ms after the last tap", () => {
    const { log, tap } = createHarness();
    tap(left);
    vi.advanceTimersByTime(250);
    tap(left);
    vi.advanceTimersByTime(650);
    tap(left);
    vi.advanceTimersByTime(650);
    tap(left);
    expect(log).toEqual(["seek -1", "seek -2", "seek -3"]);
    vi.advanceTimersByTime(699);
    expect(log).not.toContain("end");
    vi.advanceTimersByTime(1);
    expect(log).toEqual(["seek -1", "seek -2", "seek -3", "end"]);
  });

  it("treats taps 300 ms apart, or on opposite sides, as single taps", () => {
    const { log, tap } = createHarness();
    tap(right, "first");
    vi.advanceTimersByTime(300);
    tap(right, "second");
    expect(log).toEqual(["first"]);
    tap(left, "third");
    expect(log).toEqual(["first", "second"]);
    vi.advanceTimersByTime(300);
    expect(log).toEqual(["first", "second", "third"]);
  });

  it("restarts the count when a burst switches sides; a centre tap ends it", () => {
    const { log, tap } = createHarness();
    tap(right);
    tap(right);
    tap(right);
    tap(left);
    tap(left);
    expect(log).toEqual(["seek 1", "seek 2", "seek -1", "seek -2"]);
    tap(centre, "centre");
    expect(log.slice(4)).toEqual(["end", "centre"]);
    vi.advanceTimersByTime(1000);
    expect(log).toHaveLength(6);
  });

  it("drops a pending tap when cancelled", () => {
    const { log, seek, tap } = createHarness();
    tap(left);
    seek.cancel();
    vi.advanceTimersByTime(1000);
    expect(log).toEqual([]);
  });
});
