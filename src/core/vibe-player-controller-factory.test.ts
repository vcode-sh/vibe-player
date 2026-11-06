import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import { RenewalAdapter } from "./vibe-player-renewal-test-helpers";
import type { VibePlayerAdapter } from "./vibe-player-types";

function deferredAdapter() {
  let resolve: (adapter: VibePlayerAdapter) => void = () => undefined;
  let reject: (cause: Error) => void = () => undefined;
  const promise = new Promise<VibePlayerAdapter>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, reject, resolve };
}

describe("controller asynchronous adapter factories", () => {
  it.each(["stop", "replace", "unmount"] as const)(
    "disposes an obsolete factory result after %s without attaching media",
    async (operation) => {
      const deferred = deferredAdapter();
      const old = new TestAdapter();
      const current = new TestAdapter();
      const factoryStarted = vi.fn();
      const controller = new VibePlayerController({
        adapterFactory: (source) => {
          if (source.id === "replacement") {
            return current;
          }
          factoryStarted();
          return deferred.promise;
        },
      });
      await controller.mount(document.createElement("div"));
      const loading = controller.load(fileSource);
      await vi.waitFor(() => expect(factoryStarted).toHaveBeenCalledTimes(1));
      if (operation === "replace") {
        await controller.load({ ...fileSource, id: "replacement" });
      } else {
        await controller[operation]();
      }

      deferred.resolve(old);
      await loading;

      expect(old.calls).toEqual(["unmount"]);
      expect(controller.getState().snapshot.readyState).not.toBe("playing");
      if (operation === "replace") {
        expect(controller.getState().currentSource?.id).toBe("replacement");
        expect(current.calls).toContain("load:replacement");
      }
      await controller.teardown();
    }
  );

  it("reports a current factory rejection as a create failure", async () => {
    const deferred = deferredAdapter();
    const cause = new Error("Provider module unavailable");
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => deferred.promise,
      onError,
    });
    const loading = controller.load(fileSource);
    const outcome = expect(loading).rejects.toBe(cause);
    deferred.reject(cause);
    await outcome;
    expect(controller.getState().error).toMatchObject({
      cause,
      phase: "create",
      sourceId: "video-1",
    });
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });

  it("reports a load failure even when a nonfatal warning preceded it", async () => {
    const adapter = new RenewalAdapter();
    const cause = new Error("Manifest load failed");
    adapter.load = () => {
      adapter.fail(false);
      return Promise.reject(cause);
    };
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await expect(controller.load(fileSource)).rejects.toBe(cause);
    expect(controller.getState().error).toMatchObject({ cause, phase: "load" });
    expect(onError).toHaveBeenCalledTimes(1);
    await controller.teardown();
  });
});
