import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";

const controllers = new Set<VibePlayerController>();

async function loadManagedHls() {
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
  });
  controllers.add(controller);
  await controller.mount(document.createElement("div"));
  await controller.load({ id: "stream", type: "hls", url: "/master.m3u8" });
  return controller;
}

describe("managed HLS error categories", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    { details: "fragLoadError", kind: "network", type: "networkError" },
    {
      details: "manifestLoadError",
      kind: "source",
      status: 404,
      type: "networkError",
    },
    {
      details: "fragLoadError",
      kind: "source",
      status: 403,
      type: "networkError",
    },
    {
      details: "fragLoadError",
      kind: "network",
      status: 503,
      type: "networkError",
    },
    { details: "bufferAppendError", kind: "decode", type: "mediaError" },
    {
      details: "manifestIncompatibleCodecsError",
      kind: "source",
      type: "mediaError",
    },
    { details: "fragParsingError", kind: "decode", type: "muxError" },
    { details: "internalException", kind: "unknown", type: "otherError" },
  ])(
    "reports a fatal $type ($details $status) as $kind",
    async ({ details, kind, status, type }) => {
      const controller = await loadManagedHls();
      getLatestHlsEngine().emit(HlsEngineProbe.Events.ERROR, {
        details,
        error: new Error(details),
        fatal: true,
        ...(status ? { response: { code: status } } : {}),
        type,
      });
      expect(controller.getState().error).toMatchObject({
        details: { kind },
        kind,
      });
    }
  );
});
