import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
} from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { createSingleFileSource } from "../file/file-adapter-test-helpers";
import { createHlsAdapter } from "../hls/create-hls-adapter";
import { createHlsRuntime, hlsSource } from "../hls/hls-adapter-test-helpers";
import { createAdapterTestScope } from "../shared/adapter-test-helpers";

const adapterScope = createAdapterTestScope();
const volumeDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "volume"
);

/** iPhone Safari: volume belongs to the hardware, so writes are ignored. */
function makeVolumeReadOnly(): void {
  Object.defineProperty(HTMLMediaElement.prototype, "volume", {
    configurable: true,
    get: () => 1,
    set: () => undefined,
  });
}

const players = [
  {
    create: () => createFileAdapter(),
    name: "file",
    source: createSingleFileSource(),
  },
  {
    create: () => createHlsAdapter(createHlsRuntime().runtime),
    name: "HLS",
    source: hlsSource,
  },
];

async function loadPlayer(
  create: () => VibePlayerAdapter,
  source: Parameters<VibePlayerAdapter["load"]>[0],
  target: HTMLElement = document.createElement("div")
) {
  const adapter = adapterScope.track(create());
  await adapter.mount(target);
  await adapter.load(source);
  return adapter;
}

describe("native volume control detection", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
  });

  afterEach(async () => {
    await adapterScope.cleanup();
    if (volumeDescriptor) {
      Object.defineProperty(
        HTMLMediaElement.prototype,
        "volume",
        volumeDescriptor
      );
    }
    vi.restoreAllMocks();
  });

  it.each(players)(
    "reports no volume control for $name media with read-only volume",
    async ({ create, source }) => {
      makeVolumeReadOnly();
      const adapter = await loadPlayer(create, source);

      expect(adapter.capabilities.supportsVolumeControl).toBe(false);
      expect(adapter.capabilities.supportsMute).toBe(true);
    }
  );

  it.each(players)(
    "keeps volume control for $name media with writable volume",
    async ({ create, source }) => {
      const adapter = await loadPlayer(create, source);

      expect(adapter.capabilities.supportsVolumeControl).toBe(true);
    }
  );

  it("leaves a host video's volume untouched while detecting", async () => {
    const video = document.createElement("video");
    video.volume = 0.3;
    const events: VibePlayerAdapterEvent["type"][] = [];
    const adapter = adapterScope.track(createFileAdapter());
    adapter.subscribe((event) => events.push(event.type));
    await adapter.mount(video);
    await adapter.load(createSingleFileSource());

    expect(adapter.capabilities.supportsVolumeControl).toBe(true);
    expect(video.volume).toBe(0.3);
    expect(events).not.toContain("volumechange");
  });
});
