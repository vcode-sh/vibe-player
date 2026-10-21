import { describe, expect, it, vi } from "vitest";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";

const { hls } = vi.hoisted(() => ({
  hls: {
    attachMedia: vi.fn(),
    currentLevel: -1,
    destroy: vi.fn(),
    levels: [
      { bitrate: 1_500_000, height: 720 },
      { bitrate: 4_500_000, height: 1080 },
    ],
    loadSource: vi.fn(),
    nextLevel: -1,
    on: vi.fn(),
  },
}));

vi.mock("hls.js", () => ({
  default: class {
    static Events = {
      ERROR: "hlsError",
      LEVEL_LOADED: "hlsLevelLoaded",
      LEVEL_SWITCHED: "hlsLevelSwitched",
      LEVELS_UPDATED: "hlsLevelsUpdated",
      MANIFEST_PARSED: "hlsManifestParsed",
    };

    static isSupported() {
      return true;
    }

    attachMedia = hls.attachMedia;
    destroy = hls.destroy;
    levels = hls.levels;
    loadSource = hls.loadSource;
    on = hls.on;

    set currentLevel(level: number) {
      hls.currentLevel = level;
    }

    set nextLevel(level: number) {
      hls.nextLevel = level;
    }
  },
}));

describe("managed HLS quality switching", () => {
  it("switches manual and automatic quality without flushing playback", async () => {
    const onLevelsChanged = vi.fn();
    const controller = await defaultHlsAdapterRuntime.attachManagedHls({
      manifestUrl: "https://example.com/stream.m3u8",
      onError: vi.fn(),
      onLevelLoaded: vi.fn(),
      onLevelsChanged,
      onReady: vi.fn(),
      video: document.createElement("video"),
    });

    controller.setQualityLevel(1);

    expect(hls.nextLevel).toBe(1);
    expect(hls.currentLevel).toBe(-1);
    expect(onLevelsChanged).toHaveBeenLastCalledWith(
      [
        { bitrate: 1_500_000, height: 720 },
        { bitrate: 4_500_000, height: 1080 },
      ],
      1
    );

    controller.setQualityLevel(-1);

    expect(hls.nextLevel).toBe(-1);
    expect(onLevelsChanged).toHaveBeenLastCalledWith(
      [
        { bitrate: 1_500_000, height: 720 },
        { bitrate: 4_500_000, height: 1080 },
      ],
      -1
    );
    controller.destroy();
  });
});
