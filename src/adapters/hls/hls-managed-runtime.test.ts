import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";
import type {
  ManagedHlsController,
  ManagedHlsSession,
} from "./hls-runtime-types";

const controllers = new Set<ManagedHlsController>();

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
    manualLevel: -1,
    nextLevel: -1,
    on: vi.fn<
      (event: string, handler: (event: string, data: unknown) => void) => void
    >(),
    startLoad: vi.fn(),
  },
}));

vi.mock("hls.js", () => ({
  default: class {
    static Events = {
      ERROR: "hlsError",
      FRAG_LOADED: "hlsFragLoaded",
      LEVEL_LOADED: "hlsLevelLoaded",
      LEVEL_SWITCHED: "hlsLevelSwitched",
      LEVELS_UPDATED: "hlsLevelsUpdated",
      MANIFEST_PARSED: "hlsManifestParsed",
      MEDIA_ATTACHED: "hlsMediaAttached",
    };

    static isSupported() {
      return true;
    }

    attachMedia = hls.attachMedia;
    destroy = hls.destroy;
    levels = hls.levels;
    loadSource = hls.loadSource;
    on = hls.on;
    startLoad = hls.startLoad;

    get manualLevel() {
      return hls.manualLevel;
    }

    set currentLevel(level: number) {
      hls.currentLevel = level;
    }

    set nextLevel(level: number) {
      hls.nextLevel = level;
      hls.manualLevel = level;
    }
  },
}));

async function attachManagedHls(session: ManagedHlsSession) {
  const controller = await defaultHlsAdapterRuntime.attachManagedHls(session);
  controllers.add(controller);
  return controller;
}

function emitHlsEvent(event: string, data: unknown = {}): void {
  const binding = hls.on.mock.calls.find(([name]) => name === event);
  if (!binding) {
    throw new Error(`No SDK callback registered for ${event}.`);
  }
  binding[1](event, data);
}

describe("managed HLS runtime translation", () => {
  afterEach(() => {
    for (const controller of controllers) {
      controller.destroy();
    }
    controllers.clear();
    hls.currentLevel = -1;
    hls.manualLevel = -1;
    hls.nextLevel = -1;
    vi.clearAllMocks();
  });

  it("selects next-fragment quality without using the immediate switch setter", async () => {
    const onLevelsChanged = vi.fn();
    const controller = await attachManagedHls({
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
  });

  it("translates SDK metadata and errors into the active session callbacks", async () => {
    const session = {
      manifestUrl: "https://example.com/stream.m3u8",
      onError: vi.fn(),
      onLevelLoaded: vi.fn(),
      onLevelsChanged: vi.fn(),
      onReady: vi.fn(),
      video: document.createElement("video"),
    };
    await attachManagedHls(session);
    expect(hls.attachMedia).toHaveBeenCalledWith(session.video);
    expect(hls.loadSource).not.toHaveBeenCalled();
    emitHlsEvent("hlsMediaAttached");
    expect(hls.loadSource).toHaveBeenCalledWith(session.manifestUrl);
    expect(hls.startLoad).toHaveBeenCalledWith(-1);

    emitHlsEvent("hlsManifestParsed");
    expect(session.onReady).toHaveBeenCalledOnce();
    expect(session.onLevelsChanged).toHaveBeenLastCalledWith(
      [
        { bitrate: 1_500_000, height: 720 },
        { bitrate: 4_500_000, height: 1080 },
      ],
      -1
    );
    emitHlsEvent("hlsLevelLoaded", { details: { live: true } });
    expect(session.onLevelLoaded).toHaveBeenLastCalledWith(true);
    emitHlsEvent("hlsLevelLoaded", { details: { live: false } });
    expect(session.onLevelLoaded).toHaveBeenLastCalledWith(false);

    emitHlsEvent("hlsError", {
      details: "fragLoadError",
      error: new Error("Segment unavailable"),
      fatal: false,
      type: "networkError",
    });
    expect(session.onError).toHaveBeenCalledExactlyOnceWith({
      details: "fragLoadError",
      fatal: false,
      message: "Segment unavailable",
      network: true,
      type: "networkError",
    });
  });
});
