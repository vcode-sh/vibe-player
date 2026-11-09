import type Hls from "hls.js";
import type { ErrorData } from "hls.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createProbeHlsSession,
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";
import { ManagedHlsMediaRecovery } from "./hls-media-recovery";

const controllers = new Set<VibePlayerController>();

async function loadManagedHls() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(10_000);
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const onError = vi.fn();
  const onEvent = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onError,
    onEvent,
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
  const errorEvents = () =>
    onEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === "error");
  return { controller, engine, errorEvents, fail, onError };
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
    const { controller, engine, errorEvents, fail, onError } =
      await loadManagedHls();

    fail();
    expect(engine.recoveries).toEqual(["recoverMediaError"]);
    expect(errorEvents()).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({ fatal: false, sdkFatal: true }),
        type: "error",
      }),
    ]);
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

  it("fails a stream that keeps failing after four recoveries in a minute", async () => {
    const { controller, engine, fail, onError } = await loadManagedHls();

    for (let failure = 0; failure < 4; failure += 1) {
      fail();
      vi.advanceTimersByTime(4000);
    }
    expect(engine.recoveries).toEqual(new Array(4).fill("recoverMediaError"));
    expect(controller.getState().error).toBeNull();
    fail();

    expect(engine.recoveries).toHaveLength(4);
    expect(controller.getState().error).toMatchObject({ kind: "decode" });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("allows a fresh recovery once older ones leave the minute", async () => {
    const { controller, engine, fail } = await loadManagedHls();

    for (let failure = 0; failure < 4; failure += 1) {
      fail();
      vi.advanceTimersByTime(15_000);
    }
    fail();

    expect(engine.recoveries).toEqual(new Array(5).fill("recoverMediaError"));
    expect(controller.getState().error).toBeNull();
  });

  it("keeps a fatal network error terminal without media recovery", async () => {
    const { controller, engine, fail } = await loadManagedHls();

    fail("networkError");

    expect(engine.recoveries).toEqual([]);
    expect(controller.getState().error).toMatchObject({ kind: "network" });
  });

  it("drops a pending resume when a later error is terminal", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const resume = vi.fn();
    const engine = new HlsEngineProbe({});
    const recovery = new ManagedHlsMediaRecovery(engine as unknown as Hls, {
      ...createProbeHlsSession(),
      onMediaRecovery: () => resume,
    });
    const failure = {
      details: "bufferAppendError",
      fatal: true,
      type: "mediaError",
    } as ErrorData;

    expect([1, 2, 3].map(() => recovery.recover(failure))).toEqual([
      true,
      true,
      false,
    ]);
    // hls.js still reports the pending reattach; it must not reload the source.
    expect(recovery.mediaAttached()).toBe(true);
    expect(resume).not.toHaveBeenCalled();
  });
});
