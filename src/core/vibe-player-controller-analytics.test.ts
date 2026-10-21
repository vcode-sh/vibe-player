import { describe, expect, it } from "vitest";
import {
  createControllerHarness,
  fileSource,
  getAdapter,
} from "./vibe-player-controller-test-helpers";

describe("VibePlayerController analytics", () => {
  it("emits session analytics once per milestone", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);

    adapter.emit("play", { currentTime: 1, paused: false });
    adapter.emit("play", { currentTime: 2, paused: false });
    adapter.emit("timeupdate", { currentTime: 26, duration: 100 });
    adapter.emit("timeupdate", { currentTime: 80, duration: 100 });
    adapter.emit("timeupdate", { currentTime: 80, duration: 100 });
    adapter.emit("ended", { currentTime: 100, readyState: "ended" });
    adapter.emit("ended", { currentTime: 100, readyState: "ended" });
    await controller.teardown();

    expect(analytics.map((event) => event.type)).toEqual([
      "opened",
      "started",
      "progress_25",
      "progress_50",
      "progress_75",
      "completed",
      "closed",
    ]);
    expect(resumeCalls).toContain("clear:video-1");
    expect(analytics.find((event) => event.type === "started")).toEqual({
      currentTime: 1,
      duration: 100,
      provider: "file",
      sourceId: "video-1",
      type: "started",
    });
    expect(analytics.find((event) => event.type === "progress_50")).toEqual({
      currentTime: 80,
      duration: 100,
      provider: "file",
      sourceId: "video-1",
      type: "progress_50",
    });
  });

  it("rearms milestones for a new source without attributing them to the old session", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    await controller.load(fileSource);
    getAdapter(adapters, 0).emit("timeupdate", {
      currentTime: 25,
      duration: 100,
    });
    await controller.load({ ...fileSource, id: "video-2" });
    getAdapter(adapters, 1).emit("timeupdate", {
      currentTime: 50,
      duration: 200,
    });

    expect(analytics.filter((event) => event.type === "progress_25")).toEqual([
      {
        currentTime: 25,
        duration: 100,
        provider: "file",
        sourceId: "video-1",
        type: "progress_25",
      },
      {
        currentTime: 50,
        duration: 200,
        provider: "file",
        sourceId: "video-2",
        type: "progress_25",
      },
    ]);
    await controller.teardown();
  });
});
