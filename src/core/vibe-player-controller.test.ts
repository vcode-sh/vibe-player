import { describe, expect, it } from "vitest";
import {
  createBlockedPlaybackError,
  createControllerHarness,
  createControllerWithAdapter,
  fileSource,
  getAdapter,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerFileSource } from "./vibe-player-types";

describe("VibePlayerController", () => {
  it("mounts, loads, and restores resume position", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness(12);
    const target = document.createElement("div");

    await controller.mount(target);
    await controller.load(fileSource);

    const adapter = getAdapter(adapters, 0);
    expect(adapter.calls).toEqual(["mount:div", "load:video-1", "seek:12"]);
    expect(controller.getState().snapshot.currentTime).toBe(12);
    expect(analytics.map((event) => event.type)).toEqual(["opened"]);
    expect(resumeCalls).toEqual(["get:video-1"]);
  });

  it("forwards playback commands through the active adapter", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.calls.length = 0;

    await controller.play();
    await controller.pause();
    await controller.seekTo(24);
    await controller.setMuted(true);
    await controller.setPlaybackRate(1.25);
    await controller.setVolume(0.4);

    expect(adapter.calls).toEqual([
      "play",
      "pause",
      "seek:24",
      "muted:true",
      "rate:1.25",
      "volume:0.4",
    ]);
    expect(analytics.map((event) => event.type)).toEqual(["opened", "seek"]);
    expect(resumeCalls).toContain("set:video-1:24");
  });

  it("surfaces play intent as buffering before provider playback events", async () => {
    const { adapters, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);

    await controller.play();

    expect(controller.getState().lastEvent).toBe("play");
    expect(controller.getState().playbackBlocked).toBe(false);
    expect(controller.getState().snapshot).toMatchObject({
      paused: false,
      readyState: "buffering",
    });
    adapter.emit("play", { paused: false, readyState: "playing" });
    expect(controller.getState().snapshot.readyState).toBe("playing");
  });

  it("does not surface play intent for non-playable adapters", async () => {
    const { adapters, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.capabilities.supportsPlayback = false;

    await controller.play();

    expect(adapter.calls).not.toContain("play");
    expect(controller.getState().lastEvent).toBe("ready");
    expect(controller.getState().snapshot.readyState).toBe("ready");
  });

  it("syncs the paused snapshot immediately after pause commands", async () => {
    const { adapters, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.pauseLeavesSnapshotStale = true;
    adapter.emit("play", { paused: false, readyState: "buffering" });

    await controller.pause();

    expect(controller.getState().lastEvent).toBe("pause");
    expect(controller.getState().snapshot).toMatchObject({
      paused: true,
      readyState: "ready",
    });
  });

  it("tracks browser-blocked playback attempts", async () => {
    const { adapters, controller } = createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.playError = createBlockedPlaybackError();

    await controller.play();

    expect(controller.getState().lastEvent).toBe("playblocked");
    expect(controller.getState().playbackBlocked).toBe(true);
    expect(controller.getState().snapshot.paused).toBe(true);
    adapter.playError = null;
    adapter.emit("play", { currentTime: 0, paused: false });
    expect(controller.getState().playbackBlocked).toBe(false);
    adapter.emit("playblocked", { paused: true });
    expect(controller.getState().playbackBlocked).toBe(true);
  });

  it("surfaces adapter load failures as an error state", async () => {
    const adapter = new TestAdapter();
    adapter.loadError = new Error("Provider failed");
    const { analytics, controller } = createControllerWithAdapter(adapter);

    await expect(controller.load(fileSource)).rejects.toThrow(
      "Provider failed"
    );

    expect(controller.getState()).toMatchObject({ currentSource: fileSource });
    expect(controller.getState().lastEvent).toBe("error");
    expect(controller.getState().snapshot.readyState).toBe("error");
    expect(analytics.map((event) => event.type)).toEqual(["error"]);
  });

  it("keeps source identity for adapter events emitted during load", async () => {
    const adapter = new TestAdapter();
    adapter.emitReadyDuringLoad = true;
    const { controller } = createControllerWithAdapter(adapter);
    const observedStates: string[] = [];
    controller.subscribe((state) => {
      if (state.lastEvent === "ready") {
        observedStates.push(state.currentSource?.id ?? "missing");
      }
    });

    await controller.load(fileSource);

    expect(observedStates).toContain("video-1");
    expect(observedStates).not.toContain("missing");
    expect(controller.getState().currentSource?.id).toBe("video-1");
  });

  it("closes and unmounts the previous adapter when loading a new source", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    const nextSource: VibePlayerFileSource = { ...fileSource, id: "video-2" };

    await controller.load(fileSource);
    const firstAdapter = getAdapter(adapters, 0);
    await controller.load(nextSource);
    firstAdapter.emit("pause", { paused: true });

    expect(firstAdapter.calls).toContain("unmount");
    expect(controller.getState().currentSource?.id).toBe("video-2");
    expect(controller.getState().lastEvent).toBe("ready");
    expect(analytics.map((event) => event.type)).toEqual([
      "opened",
      "closed",
      "opened",
    ]);
  });

  it("clears the active source without losing the mount target", async () => {
    const { adapters, controller } = createControllerHarness();
    const target = document.createElement("div");

    await controller.mount(target);
    await controller.load(fileSource);
    await controller.closeSource();
    await controller.load({ ...fileSource, id: "video-2" });

    expect(getAdapter(adapters, 0).calls).toContain("unmount");
    expect(getAdapter(adapters, 1).calls).toContain("mount:div");
    expect(controller.getState().currentSource?.id).toBe("video-2");
  });
});
