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
  });
});
