import { describe, expect, it, vi } from "vitest";
import { fileSource } from "./vibe-player-controller-test-helpers";
import {
  deferredSource,
  renewalHarness,
} from "./vibe-player-renewal-test-helpers";

const refreshed = {
  ...fileSource,
  sources: [{ mimeType: "video/mp4", url: "https://example.com/fresh.mp4" }],
};

describe("renewal ownership", () => {
  it("ignores retired adapter events after unmount", async () => {
    const renewSource = vi.fn(async () => refreshed);
    const onEvent = vi.fn();
    const { controller, adapter, adapters } = renewalHarness({
      onEvent,
      renewSource,
    });
    await controller.load(fileSource);
    await controller.play();
    await controller.unmount();
    const unmountedState = controller.getState();
    onEvent.mockClear();

    adapter(0).fail();

    expect(onEvent).not.toHaveBeenCalled();
    expect(controller.getState()).toBe(unmountedState);
    expect(renewSource).not.toHaveBeenCalled();
    expect(adapters).toHaveLength(1);
    await controller.teardown();
  });

  it.each(["stop", "unmount", "replace", "closeSource", "teardown"] as const)(
    "does not attach a late renewal after %s",
    async (operation) => {
      const pending = deferredSource();
      const renewSource = vi.fn(() => pending.promise);
      const onRenew = vi.fn();
      const { controller, adapter, adapters } = renewalHarness({
        onRenew,
        renewSource,
      });
      await controller.load(fileSource);
      await controller.play();
      adapter(0).emit("timeupdate", {
        currentTime: 37,
        paused: false,
        readyState: "playing",
      });
      adapter(0).fail();
      await vi.waitFor(() => expect(renewSource).toHaveBeenCalledTimes(1));
      const recovery = controller.activate();

      if (operation === "replace") {
        await controller.load({ ...fileSource, id: "replacement" });
      } else {
        await controller[operation]();
      }
      pending.resolve(refreshed);
      await recovery;

      expect(onRenew).not.toHaveBeenCalled();
      expect(adapters).toHaveLength(operation === "replace" ? 2 : 1);
      expect(controller.getState().currentSource).not.toEqual(refreshed);
      if (operation === "replace") {
        expect(controller.getState().currentSource?.id).toBe("replacement");
      }
      await controller.teardown();
    }
  );

  it("keeps a newer pause intent while a delivery is being renewed", async () => {
    const pending = deferredSource();
    const renewSource = vi.fn(() => pending.promise);
    const { controller, adapter, settled } = renewalHarness({ renewSource });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).emit("timeupdate", {
      currentTime: 29,
      paused: false,
      readyState: "playing",
    });
    adapter(0).fail();
    await vi.waitFor(() => expect(renewSource).toHaveBeenCalledTimes(1));

    await controller.pause();
    pending.resolve(refreshed);
    await settled(2);

    expect(adapter(1).calls).not.toContain("play");
    expect(controller.getState().snapshot).toMatchObject({
      currentTime: 29,
      paused: true,
    });
    await controller.teardown();
  });

  it("does not play after the host stops in its renewal callback", async () => {
    let stopped: Promise<void> | undefined;
    const { controller, adapter, settled } = renewalHarness({
      onRenew: () => {
        stopped = controller.stop();
      },
      renewSource: async () => refreshed,
    });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).fail();
    await settled(2);
    await stopped;
    expect(adapter(1).calls).not.toContain("play");
    expect(controller.getState().snapshot).toMatchObject({
      paused: true,
      readyState: "idle",
    });
    await controller.teardown();
  });
});
