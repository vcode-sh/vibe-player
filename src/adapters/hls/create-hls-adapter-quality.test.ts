import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../../core/vibe-player-types";
import { getMountedNativeVideo } from "../native/native-video-test-helpers";
import { createAdapterTestScope } from "../shared/adapter-test-helpers";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createHlsRuntime,
  getManagedSession,
  hlsSource,
} from "./hls-adapter-test-helpers";

const adapterScope = createAdapterTestScope();

describe("HLS quality selection", () => {
  afterEach(async () => {
    await adapterScope.cleanup();
    vi.restoreAllMocks();
  });

  it("exposes and sets managed HLS quality options", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime();
    const adapter = adapterScope.track(createHlsAdapter(runtime));
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
    const previousOptions = adapter.getSnapshot().qualityOptions;
    await Promise.all(
      ["unsupported", "level:1junk", "level:1.5", "level:9"].map((qualityId) =>
        adapter.setQuality?.(qualityId)
      )
    );
    expect(adapter.getSnapshot().qualityOptions).toEqual(previousOptions);
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
    const { probe, runtime } = createHlsRuntime();
    const adapter = adapterScope.track(createHlsAdapter(runtime));

    await adapter.mount(document.createElement("div"));
    await adapter.load(hlsSource);

    expect(probe.session?.manifestUrl).toBe(hlsSource.manifestUrl);
  });

  it("keeps quality callbacks current after playback starts", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const { probe, runtime } = createHlsRuntime();
    const adapter = adapterScope.track(createHlsAdapter(runtime));
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
    const adapter = adapterScope.track(
      createHlsAdapter({
        attachManagedHls: () => {
          throw new Error("managed unavailable");
        },
        canUseManagedHls: () => true,
      })
    );
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(hlsSource);

    expect(target.querySelector("video")?.getAttribute("src")).toBe(
      hlsSource.manifestUrl
    );
    expect(adapter.capabilities.supportsQualitySelection).toBe(false);
  });
});
