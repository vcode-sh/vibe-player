import { describe, expect, it } from "vitest";
import { selectVibePlayerSeekThumbnail } from "./select-vibe-player-seek-thumbnail";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";

const frames: readonly VibePlayerSeekThumbnail[] = [
  { endTime: 9, startTime: 4, url: "/middle.jpg" },
  { endTime: 4, startTime: 0, url: "/start.jpg" },
  { endTime: 20, startTime: 12, url: "/end.jpg" },
];

describe("seek thumbnail selection", () => {
  it.each([
    [0, "/start.jpg"],
    [3.999, "/start.jpg"],
    [4, "/middle.jpg"],
    [8.999, "/middle.jpg"],
    [9, undefined],
    [11.999, undefined],
    [12, "/end.jpg"],
    [20, "/end.jpg"],
    [21, undefined],
    [-1, undefined],
    [Number.NaN, undefined],
  ])("selects the frame for %s seconds", (time, url) => {
    expect(selectVibePlayerSeekThumbnail(frames, Number(time), 20)?.url).toBe(
      url
    );
  });

  it("does not extend an earlier frame to the end of a longer video", () => {
    expect(selectVibePlayerSeekThumbnail(frames, 20, 25)).toBeUndefined();
  });

  it("uses the first valid matching entry, skipping malformed map data", () => {
    const valid = { endTime: 8, startTime: 0, url: "/valid.jpg" };
    const invalid = [
      { ...valid, startTime: -1 },
      { ...valid, endTime: Number.POSITIVE_INFINITY },
      { ...valid, url: " " },
      { ...valid, sprite: { height: 90, width: 160, x: -1, y: 0 } },
      { ...valid, sprite: { height: 90, width: 0, x: 0, y: 0 } },
    ];
    const thumbnails = [...invalid, valid, ...frames];
    expect(selectVibePlayerSeekThumbnail(thumbnails, 5, 20)).toBe(valid);
    expect(selectVibePlayerSeekThumbnail(undefined, 5, 20)).toBeUndefined();
  });
});
