import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapterEvent,
  VibePlayerHlsSource,
} from "../../core/index";
import { getMountedNativeVideo } from "../native/native-video-test-helpers";
import { createHlsAdapter } from "./create-hls-adapter";
import type { HlsAdapterRuntime, ManagedHlsSession } from "./hls-runtime-types";

const hlsSource: VibePlayerHlsSource = {
  id: "hls-quality",
  manifestUrl: "https://example.com/stream.m3u8",
  type: "hls",
};

interface RuntimeProbe {
  qualityLevel: number;
  session: ManagedHlsSession | null;
}

function createRuntime(): {
  probe: RuntimeProbe;
  runtime: HlsAdapterRuntime;
} {
  const probe: RuntimeProbe = {
    qualityLevel: -1,
    session: null,
  };
  return {
    probe,
    runtime: {
      attachManagedHls(session) {
        probe.session = session;
        return {
          destroy: () => undefined,
          setQualityLevel: (levelIndex) => {
            probe.qualityLevel = levelIndex;
          },
        };
      },
      canUseManagedHls: () => true,
    },
  };
}

function getManagedSession(probe: RuntimeProbe): ManagedHlsSession {
  if (!probe.session) {
    throw new Error("Expected managed HLS session.");
  }
  return probe.session;
}

describe("HLS quality selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes and sets managed HLS quality options", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createRuntime();
    const adapter = createHlsAdapter(runtime);
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => {
      events.push(event);
    });

    await adapter.mount(document.createElement("div"));
    await adapter.load(hlsSource);
    getManagedSession(probe).onLevelsChanged(
      [
        { bitrate: 1_500_000, height: 720, name: "720" },
        { bitrate: 4_500_000, height: 1080, name: "1080p" },
      ],
      -1
    );
    await adapter.setQuality?.("level:1");

    expect(adapter.capabilities.supportsQualitySelection).toBe(true);
    expect(adapter.getSnapshot().qualityOptions).toMatchObject([
      { id: "auto", label: "Auto", selected: false },
      { id: "level:0", label: "720p", selected: false },
      { id: "level:1", label: "1080p", selected: true },
    ]);
    expect(probe.qualityLevel).toBe(1);
    expect(events.at(-1)?.type).toBe("qualitychange");

    await adapter.setQuality?.("auto");
    expect(probe.qualityLevel).toBe(-1);
    expect(adapter.getSnapshot().qualityOptions).toMatchObject([
      { id: "auto", selected: true },
      { id: "level:0", selected: false },
      { id: "level:1", selected: false },
    ]);
    const eventCount = events.length;
    await adapter.setQuality?.("unsupported");
    expect(probe.qualityLevel).toBe(-1);
    expect(events).toHaveLength(eventCount);
  });

  it("prefers managed HLS when native HLS is also available", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "probably"
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createRuntime();
    const adapter = createHlsAdapter(runtime);

    await adapter.mount(document.createElement("div"));
    await adapter.load(hlsSource);

    expect(probe.session?.manifestUrl).toBe(hlsSource.manifestUrl);
  });

  it("keeps quality callbacks current after playback starts", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createRuntime();
    const adapter = createHlsAdapter(runtime);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(hlsSource);
    getMountedNativeVideo(target).play = () => Promise.resolve();
    await adapter.play();
    getManagedSession(probe).onLevelsChanged(
      [
        { bitrate: 1_500_000, height: 720, name: "720" },
        { bitrate: 4_500_000, height: 1080, name: "1080p" },
      ],
      -1
    );

    expect(adapter.capabilities.supportsQualitySelection).toBe(true);
    expect(adapter.getSnapshot().qualityOptions).toMatchObject([
      { id: "auto", label: "Auto", selected: true },
      { id: "level:0", label: "720p", selected: false },
      { id: "level:1", label: "1080p", selected: false },
    ]);
  });

  it("falls back to native HLS when managed HLS startup fails", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "probably"
    );
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createHlsAdapter({
      attachManagedHls: () => {
        throw new Error("managed unavailable");
      },
      canUseManagedHls: () => true,
    });
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(hlsSource);

    expect(target.querySelector("video")?.getAttribute("src")).toBe(
      hlsSource.manifestUrl
    );
    expect(adapter.capabilities.supportsQualitySelection).toBe(false);
  });
});
