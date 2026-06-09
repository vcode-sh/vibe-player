import { describe, expect, it } from "vitest";
import {
  clampVibePlayerVolume,
  createVibePlayerVolumeState,
  getVibePlayerVolumePercent,
} from "./vibe-player-volume";

describe("vibe player volume helpers", () => {
  it("clamps provider volume into the normalized contract", () => {
    expect(clampVibePlayerVolume(-0.5)).toBe(0);
    expect(clampVibePlayerVolume(0.42)).toBe(0.42);
    expect(clampVibePlayerVolume(2)).toBe(1);
    expect(clampVibePlayerVolume(Number.NaN)).toBe(0);
  });

  it("creates presentation state for headless volume controls", () => {
    expect(getVibePlayerVolumePercent(0.424)).toBe(42);
    expect(
      createVibePlayerVolumeState({ muted: false, volume: 0.424 })
    ).toEqual({
      muted: false,
      percent: 42,
      silent: false,
      value: 0.424,
      valueText: "Volume 42%",
    });
    expect(createVibePlayerVolumeState({ muted: true, volume: 2 })).toEqual({
      muted: true,
      percent: 100,
      silent: true,
      value: 1,
      valueText: "Muted, volume 100%",
    });
  });
});
