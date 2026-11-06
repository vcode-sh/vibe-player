import { afterEach, describe, expect, it, vi } from "vitest";
import { fileSource } from "./vibe-player-controller-test-helpers";
import {
  deferredSource,
  renewalHarness,
} from "./vibe-player-renewal-test-helpers";

const refreshed = {
  ...fileSource,
  sources: [{ mimeType: "video/mp4", url: "https://example.com/fresh.mp4" }],
};

describe("controller delivery renewal", () => {
  afterEach(() => vi.useRealTimers());

  it("renews before Play inside the 30 second expiry margin, then resumes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const renewSource = vi.fn(async () => refreshed);
    const { controller, adapter, adapters } = renewalHarness({ renewSource });
    await controller.load({ ...fileSource, expiresAt: 129_999 }, "onPlay");
    expect(renewSource).not.toHaveBeenCalled();
    expect(adapters).toHaveLength(0);

    await controller.play();

    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(controller.getState().currentSource).toEqual(refreshed);
    expect(adapter(0).calls).toContain("play");
    await controller.teardown();
  });

  it("does not renew at the exact expiry margin", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const renewSource = vi.fn(async () => refreshed);
    const { controller } = renewalHarness({ renewSource });
    await controller.load({ ...fileSource, expiresAt: 130_000 }, "onPlay");
    await controller.play();
    expect(renewSource).not.toHaveBeenCalled();
    await controller.teardown();
  });

  it("replays from zero when ended delivery must be renewed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const renewSource = vi.fn(async () => refreshed);
    const { controller, adapter } = renewalHarness({ renewSource });
    await controller.load({ ...fileSource, expiresAt: 129_999 });
    adapter(0).emit("ended", {
      currentTime: 100,
      paused: true,
      readyState: "ended",
    });

    await controller.play();

    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(adapter(1).calls).toContain("seek:0");
    expect(adapter(1).calls).not.toContain("seek:100");
    expect(controller.getState().snapshot).toMatchObject({
      currentTime: 0,
      paused: false,
    });
    await controller.teardown();
  });

  it("replaces expired delivery once and restores playback time and intent", async () => {
    const renewSource = vi.fn(async () => refreshed);
    const onRenew = vi.fn();
    const onError = vi.fn();
    const { controller, adapter, settled } = renewalHarness({
      onError,
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
    await settled(2);

    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(onRenew).toHaveBeenCalledExactlyOnceWith(refreshed);
    expect(onError).not.toHaveBeenCalled();
    expect(adapter(0).calls).toContain("unmount");
    expect(adapter(1).calls).toContain("seek:37");
    expect(adapter(1).calls).toContain("play");
    expect(controller.getState()).toMatchObject({
      error: null,
      snapshot: { currentTime: 37, paused: false },
    });
    await controller.teardown();
  });

  it("keeps paused playback paused while renewing its delivery", async () => {
    const { controller, adapter, settled } = renewalHarness({
      renewSource: async () => refreshed,
    });
    await controller.load(fileSource);
    adapter(0).emit("timeupdate", { currentTime: 23, paused: true });
    adapter(0).fail();
    await settled(2);
    expect(adapter(1).calls).not.toContain("play");
    expect(controller.getState().snapshot).toMatchObject({
      currentTime: 23,
      paused: true,
    });
    await controller.teardown();
  });

  it("rechecks opaque native HLS failures once before reporting an error", async () => {
    const renewSource = vi.fn(async () => refreshed);
    const { controller, adapter, settled } = renewalHarness({ renewSource });
    await controller.load(fileSource);
    await controller.play();

    adapter(0).failNativeHls();
    await settled(2);

    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(controller.getState().error).toBeNull();
    adapter(1).failNativeHls();
    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(controller.getState().error).not.toBeNull();
    await controller.teardown();
  });

  it("retains decoded time and Play intent when native HLS resets after failure", async () => {
    const { controller, adapter, settled } = renewalHarness({
      renewSource: async () => refreshed,
    });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).emit("timeupdate", {
      currentTime: 37,
      paused: false,
      readyState: "playing",
    });
    adapter(0).emit("pause", {
      currentTime: 0,
      paused: true,
      readyState: "error",
    });
    adapter(0).failNativeHls();
    await settled(2);

    expect(adapter(1).calls).toContain("seek:37");
    expect(adapter(1).calls).toContain("play");
    expect(controller.getState().snapshot.currentTime).toBe(37);
    await controller.teardown();
  });

  it("does not earn another retry from play before an actual playing event", async () => {
    const renewSource = vi.fn(async () => refreshed);
    const { controller, adapter, settled } = renewalHarness({ renewSource });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).fail();
    await settled(2);

    adapter(1).emit("play", { paused: false, readyState: "playing" });
    adapter(1).fail();

    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(controller.getState().error?.message).toBe("Delivery denied");
    await controller.teardown();
  });

  it("gives a later lapse a new renewal after actual playback succeeds", async () => {
    const renewSource = vi.fn(async () => refreshed);
    const { controller, adapter, settled } = renewalHarness({ renewSource });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).fail();
    await settled(2);
    adapter(1).emit("playing", { paused: false, readyState: "playing" });
    adapter(1).fail();
    await settled(3);
    expect(renewSource).toHaveBeenCalledTimes(2);
    expect(controller.getState().error).toBeNull();
    await controller.teardown();
  });

  it("enters the error state after renewal failure and retries on explicit Retry", async () => {
    const renewSource = vi
      .fn()
      .mockRejectedValueOnce(new Error("Access unavailable"))
      .mockResolvedValueOnce(refreshed);
    const { controller, adapter, settled } = renewalHarness({ renewSource });
    await controller.load(fileSource);
    await controller.play();
    adapter(0).fail();
    await vi.waitFor(() =>
      expect(controller.getState().error?.message).toBe("Access unavailable")
    );
    expect(renewSource).toHaveBeenCalledTimes(1);

    await controller.retry();
    await settled(2);

    expect(renewSource).toHaveBeenCalledTimes(2);
    expect(controller.getState().error).toBeNull();
    expect(adapter(1).calls).toContain("play");
    await controller.teardown();
  });

  it("reports a renewal in progress until it settles or is cancelled", async () => {
    const pending = deferredSource();
    const { controller, adapter } = renewalHarness({
      renewSource: () => pending.promise,
    });
    await controller.load(fileSource);
    await controller.play();
    expect(controller.getState().renewing).toBe(false);
    adapter(0).fail();
    await vi.waitFor(() => expect(controller.getState().renewing).toBe(true));
    pending.resolve(refreshed);
    await vi.waitFor(() => expect(controller.getState().renewing).toBe(false));

    const stalled = deferredSource();
    const second = renewalHarness({ renewSource: () => stalled.promise });
    await second.controller.load(fileSource);
    await second.controller.play();
    second.adapter(0).fail();
    await vi.waitFor(() =>
      expect(second.controller.getState().renewing).toBe(true)
    );
    await second.controller.stop();
    expect(second.controller.getState().renewing).toBe(false);
    await controller.teardown();
    await second.controller.teardown();
  });
});
