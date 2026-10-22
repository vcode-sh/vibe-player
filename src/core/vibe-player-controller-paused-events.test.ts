import { describe, expect, it } from "vitest";
import {
  createControllerHarness,
  fileSource,
  getAdapter,
} from "./vibe-player-controller-test-helpers";

describe("VibePlayerController paused event handling", () => {
  it("keeps late active adapter events from reopening busy chrome after pause", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.emit("play", { paused: false, readyState: "playing" });

    await controller.pause();
    adapter.emit("buffering", { paused: false, readyState: "buffering" });
    adapter.emit("timeupdate", { currentTime: 18, paused: false });
    adapter.emit("play", { paused: false, readyState: "playing" });

    expect(controller.getState().lastEvent).toBe("pause");
    expect(controller.getState().snapshot).toMatchObject({
      currentTime: 18,
      paused: true,
      readyState: "ready",
    });
    expect(analytics.map((event) => event.type)).toEqual(["opened", "started"]);
    expect(resumeCalls).not.toContain("set:video-1:18");

    await controller.play();
    adapter.emit("play", { paused: false, readyState: "playing" });

    expect(controller.getState().snapshot).toMatchObject({
      paused: false,
      readyState: "playing",
    });
  });
  it("accepts provider playback after the provider acknowledges a pause", async () => {
    const { adapters, controller, resumeCalls } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.emit("play", { paused: false, readyState: "playing" });
    await controller.pause();
    adapter.emit("pause", { paused: true, readyState: "ready" });

    adapter.emit("play", { paused: false, readyState: "playing" });
    adapter.emit("timeupdate", {
      currentTime: 37,
      paused: false,
      readyState: "playing",
    });

    expect(controller.getState().snapshot).toMatchObject({
      currentTime: 37,
      paused: false,
      readyState: "playing",
    });
    expect(resumeCalls).toContain("set:video-1:37");
    await controller.teardown();
  });

  it("does not require another pause acknowledgment for an already paused source", async () => {
    const { adapters, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    await controller.pause();

    adapter.emit("play", { paused: false, readyState: "playing" });

    expect(controller.getState().snapshot.paused).toBe(false);
    await controller.teardown();
  });
});
