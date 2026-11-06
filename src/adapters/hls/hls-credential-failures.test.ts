import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type { VibePlayerSource } from "../../core/vibe-player-types";
import { createHlsAdapter } from "./create-hls-adapter";
import {
  getLatestHlsEngine,
  HlsEngineProbe,
  loadProbeHls,
} from "./hls-engine-test-helpers";

const controllers = new Set<VibePlayerController>();
const source: VibePlayerSource = {
  id: "private",
  type: "hls",
  url: "/old/master.m3u8",
};
const renewed: VibePlayerSource = { ...source, url: "/new/master.m3u8" };

async function loadController(renewSource?: () => Promise<VibePlayerSource>) {
  vi.stubGlobal("MediaSource", class {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const onEvent = vi.fn();
  const onError = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: () => createHlsAdapter({ loadHls: loadProbeHls }),
    onError,
    onEvent,
    renewSource,
  });
  controllers.add(controller);
  await controller.mount(document.createElement("div"));
  await controller.load(source);
  return { controller, onError, onEvent };
}

function httpFailure(status: number) {
  return {
    details: "fragLoadError",
    error: new Error(`HTTP Error ${status}`),
    fatal: false,
    response: { code: status },
    type: "networkError",
  };
}

describe("expired HLS credentials", () => {
  afterEach(async () => {
    await Promise.all(
      [...controllers].map((controller) => controller.teardown())
    );
    controllers.clear();
    HlsEngineProbe.instances.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([401, 403])(
    "renews immediately on SDK-recoverable HTTP %s and spends one retry per lapse",
    async (status) => {
      const renewSource = vi.fn(async () => renewed);
      const { controller, onError } = await loadController(renewSource);
      const oldEngine = getLatestHlsEngine();
      oldEngine.emit(HlsEngineProbe.Events.ERROR, httpFailure(status));
      await vi.waitFor(() =>
        expect(controller.getState().currentSource).toEqual(renewed)
      );
      expect(renewSource).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      oldEngine.emit(HlsEngineProbe.Events.ERROR, httpFailure(status));
      const retriedEngine = getLatestHlsEngine();
      retriedEngine.emit(HlsEngineProbe.Events.ERROR, httpFailure(status));
      retriedEngine.emit(HlsEngineProbe.Events.ERROR, httpFailure(status));
      expect(renewSource).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(retriedEngine.stopped).toBe(true);
      expect(controller.getState().error?.details).toMatchObject({
        fatal: true,
        sdkFatal: false,
        status,
      });
    }
  );

  it("keeps recoverable non-auth HTTP errors out of state.error", async () => {
    const { controller, onError, onEvent } = await loadController();
    getLatestHlsEngine().emit(HlsEngineProbe.Events.ERROR, httpFailure(503));
    expect(controller.getState().error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
    expect(getLatestHlsEngine().stopped).toBe(false);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ fatal: false, status: 503 }),
        type: "error",
      })
    );
  });

  it("reads a rejected credential from transport status when the SDK omits its response", async () => {
    const { controller } = await loadController();
    getLatestHlsEngine().emit(HlsEngineProbe.Events.ERROR, {
      details: "manifestLoadError",
      error: new Error("Unauthorized"),
      fatal: false,
      networkDetails: { status: 401 },
      type: "networkError",
    });
    expect(controller.getState().error?.details).toMatchObject({
      credentialFailure: true,
      fatal: true,
      sdkFatal: false,
      status: 401,
    });
  });
});
