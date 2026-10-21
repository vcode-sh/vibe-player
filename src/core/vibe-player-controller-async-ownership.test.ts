import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import {
  createBlockedPlaybackError,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";

function createGate() {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createSourcePair() {
  const old = new TestAdapter();
  const current = new TestAdapter();
  const controller = new VibePlayerController({
    adapterFactory: (source) => (source.id === "video-1" ? old : current),
  });
  return { controller, current, old };
}

const nextSource = { ...fileSource, id: "video-2" };

describe("controller asynchronous operation ownership", () => {
  it.each(["closeSource", "teardown", "unmount"] as const)(
    "keeps a newly mounted source when an older %s finishes",
    async (operation) => {
      const { controller, current, old } = createSourcePair();
      const gate = createGate();
      let unmountCount = 0;
      old.unmount = () => {
        unmountCount += 1;
        return unmountCount === 1 ? gate.promise : Promise.resolve();
      };
      await controller.mount(document.createElement("div"));
      await controller.load(fileSource);
      const obsoleteClose = controller[operation]();
      await controller.mount(document.createElement("section"));
      await controller.load(nextSource);
      current.emit("play", {
        currentTime: 47,
        paused: false,
        readyState: "playing",
      });
      gate.resolve();
      await obsoleteClose;
      await controller.setVolume(0.4);

      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-2" },
        isMounted: true,
        snapshot: { currentTime: 47, paused: false, readyState: "playing" },
      });
      expect(current.calls).toContain("volume:0.4");
      await controller.teardown();
    }
  );

  it("keeps the same source mounted when an older unmount finishes", async () => {
    const { controller, old } = createSourcePair();
    const gate = createGate();
    old.unmount = () => gate.promise;
    await controller.mount(document.createElement("div"));
    await controller.load(fileSource);
    const pending = controller.unmount();
    await controller.mount(document.createElement("section"));
    gate.resolve();
    await pending;

    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-1" },
      isMounted: true,
    });
    expect(old.calls).toContain("mount:section");
    await controller.teardown();
  });

  it.each([
    { delayed: "play", latest: "pause", paused: true, readyState: "ready" },
    {
      delayed: "pause",
      latest: "play",
      paused: false,
      readyState: "buffering",
    },
  ] as const)(
    "keeps the newest $latest intent when an older $delayed settles on the same source",
    async ({ delayed, latest, paused, readyState }) => {
      const { controller, old } = createSourcePair();
      const gate = createGate();
      old[delayed] = () => gate.promise;
      await controller.load(fileSource);
      const obsolete = controller[delayed]();
      await controller[latest]();
      if (delayed === "play") {
        gate.reject(createBlockedPlaybackError());
      } else {
        gate.resolve();
      }
      await obsolete;

      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-1" },
        lastEvent: latest,
        playbackBlocked: false,
        snapshot: { paused, readyState },
      });
      await controller.teardown();
    }
  );

  it.each(["play", "pause"] as const)(
    "ignores a delayed %s result belonging to an old source",
    async (command) => {
      const { controller, current, old } = createSourcePair();
      const gate = createGate();
      old[command] = () => gate.promise;
      await controller.load(fileSource);
      const obsoleteCommand = controller[command]();
      await controller.load(nextSource);
      current.emit("play", {
        currentTime: 47,
        paused: false,
        readyState: "playing",
      });
      if (command === "play") {
        gate.reject(createBlockedPlaybackError());
      } else {
        gate.resolve();
      }
      await obsoleteCommand;

      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-2" },
        lastEvent: "play",
        playbackBlocked: false,
        snapshot: { currentTime: 47, paused: false, readyState: "playing" },
      });
      await controller.teardown();
    }
  );
});
