import { afterEach, describe, expect, it, vi } from "vitest";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  createProbeHlsSession,
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";
import { createHlsAdapterRuntime } from "./hls-managed-runtime";
import type { ManagedHlsController } from "./hls-runtime-types";

const controllers = new Set<ManagedHlsController>();

describe("injectable managed HLS runtime", () => {
  afterEach(() => {
    for (const controller of controllers) {
      controller.destroy();
    }
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("passes engine options through while keeping bounded inline defaults", async () => {
    const loadHls = vi.fn(loadProbeHls);
    const runtime = createHlsAdapterRuntime({
      hlsConfig: { maxBufferLength: 6 },
      loadHls,
    });
    controllers.add(await runtime.attachManagedHls(createProbeHlsSession()));
    expect(loadHls).toHaveBeenCalledOnce();
    expect(getLatestHlsEngine().config).toMatchObject({
      autoStartLoad: false,
      backBufferLength: 2,
      capLevelToPlayerSize: true,
      maxBufferLength: 6,
      maxMaxBufferLength: 12,
      startLevel: -1,
    });
  });

  it("shares measured bandwidth for five minutes and honors Save-Data", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { connection: { saveData: true } });
    const runtime = createHlsAdapterRuntime({ loadHls: loadProbeHls });
    controllers.add(await runtime.attachManagedHls(createProbeHlsSession()));
    getLatestHlsEngine().emit(HlsEngineProbe.Events.FRAG_LOADED);
    vi.advanceTimersByTime(299_999);
    controllers.add(await runtime.attachManagedHls(createProbeHlsSession()));
    expect(getLatestHlsEngine().config).toMatchObject({
      abrEwmaDefaultEstimate: 2_750_000,
      startLevel: 0,
    });
    vi.advanceTimersByTime(1);
    controllers.add(await runtime.attachManagedHls(createProbeHlsSession()));
    expect(getLatestHlsEngine().config.abrEwmaDefaultEstimate).toBeUndefined();
  });

  it("disables remote playback on the ManagedMediaSource path without native HLS", async () => {
    vi.stubGlobal("MediaSource", undefined);
    vi.stubGlobal("ManagedMediaSource", class {});
    const session = createProbeHlsSession();
    controllers.add(
      await createHlsAdapterRuntime({ loadHls: loadProbeHls }).attachManagedHls(
        session
      )
    );
    expect(session.video.disableRemotePlayback).toBe(true);
  });

  it("does not attach a late SDK import after its adapter stopped", async () => {
    vi.stubGlobal("MediaSource", class {});
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    let resolveLoader: (() => void) | undefined;
    const imported = new Promise<void>((resolve) => {
      resolveLoader = resolve;
    });
    const adapter = createHlsAdapter({
      loadHls: async () => {
        await imported;
        return loadProbeHls();
      },
    });
    await adapter.mount(document.createElement("div"));
    const loading = adapter.load({
      id: "expired",
      type: "hls",
      url: "/expired.m3u8",
    });
    await adapter.unmount();
    resolveLoader?.();
    await loading;
    expect(HlsEngineProbe.instances).toEqual([]);
    expect(adapter.getSnapshot().readyState).toBe("idle");
  });

  it("preserves fatal HTTP status diagnostics for source renewal", async () => {
    const session = createProbeHlsSession();
    const onError = vi.fn();
    controllers.add(
      await createHlsAdapterRuntime({ loadHls: loadProbeHls }).attachManagedHls(
        { ...session, onError }
      )
    );
    getLatestHlsEngine().emit(HlsEngineProbe.Events.ERROR, {
      details: "fragLoadError",
      error: new Error("Expired token"),
      fatal: true,
      response: { code: 403 },
      type: "networkError",
    });
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      credentialFailure: true,
      details: "fragLoadError",
      fatal: true,
      message: "Expired token",
      network: true,
      sdkFatal: true,
      status: 403,
      type: "networkError",
    });
  });
});
