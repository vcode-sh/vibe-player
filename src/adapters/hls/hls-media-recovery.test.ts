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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(10_000);
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const onError = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onError,
  });
  controllers.add(controller);
  await controller.mount(document.createElement("div"));
  await controller.load({ id: "stream", type: "hls", url: "/master.m3u8" });
  const engine = getLatestHlsEngine();
  const fail = (type = "mediaError") =>
    engine.emit(HlsEngineProbe.Events.ERROR, {
      details: type === "mediaError" ? "bufferStalledError" : "fragLoadError",
      error: new Error("Playback failed."),
      fatal: true,
      type,
    });
  return { controller, engine, fail, onError };
}

describe("managed HLS media error recovery", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recovers a fatal media error, then swaps the audio codec, then fails", async () => {
    const { controller, engine, fail, onError } = await loadManagedHls();

    fail();
    expect(engine.recoveries).toEqual(["recoverMediaError"]);
    vi.advanceTimersByTime(2000);
    fail();
    expect(engine.recoveries).toEqual([
      "recoverMediaError",
      "swapAudioCodec",
      "recoverMediaError",
    ]);
    expect(controller.getState().error).toBeNull();
    expect(controller.getState().snapshot.readyState).not.toBe("error");
    expect(onError).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    fail();
    expect(engine.recoveries).toHaveLength(3);
    expect(controller.getState().error).toMatchObject({ kind: "decode" });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("starts over with a plain recovery when the next media error comes much later", async () => {
    const { controller, engine, fail } = await loadManagedHls();

    fail();
    vi.advanceTimersByTime(30_000);
    fail();
    vi.advanceTimersByTime(30_000);
    fail();

    expect(engine.recoveries).toEqual([
      "recoverMediaError",
      "recoverMediaError",
      "recoverMediaError",
    ]);
    expect(controller.getState().error).toBeNull();
  });

  it("keeps a fatal network error terminal without media recovery", async () => {
    const { controller, engine, fail } = await loadManagedHls();

    fail("networkError");

    expect(engine.recoveries).toEqual([]);
    expect(controller.getState().error).toMatchObject({ kind: "network" });
  });
});
