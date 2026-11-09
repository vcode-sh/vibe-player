import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerEvent } from "./vibe-player-host-events";

async function createPlayer() {
  const adapter = new TestAdapter();
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
  });
  await controller.load(fileSource);
  return { adapter, controller };
}

describe("listeners that change during a delivery", () => {
  it("starts a state subscriber added during a delivery with the next state", async () => {
    const { adapter, controller } = await createPlayer();
    const late: (string | null)[] = [];
    const stop = controller.subscribe(() => {
      stop();
      controller.subscribe(({ lastEvent }) => {
        late.push(lastEvent);
      });
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });

    expect(late).toEqual(["seeked"]);
    await controller.teardown();
  });

  it("delivers nothing further to a state subscriber removed during a delivery", async () => {
    const { adapter, controller } = await createPlayer();
    const removed: (string | null)[] = [];
    let stopRemoved: () => void = () => undefined;
    controller.subscribe(() => stopRemoved());
    stopRemoved = controller.subscribe(({ lastEvent }) => {
      removed.push(lastEvent);
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });

    expect(removed).toEqual([]);
    await controller.teardown();
  });

  it("starts an event listener added during a delivery with the next event", async () => {
    const { adapter, controller } = await createPlayer();
    const late: string[] = [];
    const stop = controller.on("*", () => {
      stop();
      controller.on("*", ({ type }) => {
        late.push(type);
      });
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });

    expect(late).toEqual(["seeked"]);
    await controller.teardown();
  });

  it("delivers nothing further to an event listener removed during a delivery", async () => {
    const { adapter, controller } = await createPlayer();
    const removed: string[] = [];
    let stopRemoved: () => void = () => undefined;
    controller.on("*", () => stopRemoved());
    stopRemoved = controller.on("*", ({ type }) => {
      removed.push(type);
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });

    expect(removed).toEqual([]);
    await controller.teardown();
  });

  it("starts an on() listener added from onEvent with the next event", async () => {
    const adapter = new TestAdapter();
    const late: string[] = [];
    let added = false;
    const controller: VibePlayerController = new VibePlayerController({
      adapterFactory: () => adapter,
      onEvent: (event: VibePlayerEvent) => {
        if (event.type === "seeking" && !added) {
          added = true;
          controller.on("*", ({ type }) => {
            late.push(type);
          });
        }
      },
    });
    await controller.load(fileSource);

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });

    expect(late).toEqual(["seeked"]);
    await controller.teardown();
  });

  it("delivers nothing to an on() listener removed from onEvent", async () => {
    const adapter = new TestAdapter();
    const removed: string[] = [];
    let stop: () => void = () => undefined;
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onEvent: () => stop(),
    });
    await controller.load(fileSource);
    stop = controller.on("*", ({ type }) => {
      removed.push(type);
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });

    expect(removed).toEqual([]);
    await controller.teardown();
  });
});
