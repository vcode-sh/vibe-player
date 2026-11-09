import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerResumeStore } from "./vibe-player-types";
import { createWatchedPlayer } from "./vibe-player-watched-test-helpers";

/** Records every host-facing output a controller can produce. */
function createRecorder() {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
  };
  const resumeStore: VibePlayerResumeStore = {
    clear: record("resume-clear"),
    get: () => 12,
    set: record("resume-set"),
  };
  return {
    calls,
    options: {
      onAnalyticsEvent: record("analytics"),
      onError: record("error"),
      onEvent: record("event"),
      onPause: record("pause"),
      onPlay: record("play"),
      onProgress: record("progress"),
      resumeStore,
    },
    record,
  };
}

describe("VibePlayerController.retire", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("releases media without reporting the pending batch, closing analytics or saving", async () => {
    const recorder = createRecorder();
    const { adapter, controller, play, reports } = await createWatchedPlayer(
      recorder.options
    );
    controller.subscribe(recorder.record("state"));
    controller.on("*", recorder.record("listener"));
    play(0, 6);
    expect(recorder.calls).toContain("analytics");
    recorder.calls.length = 0;

    await controller.retire();
    adapter.emit("pause", { paused: true, readyState: "ready" });
    adapter.emit("error", { readyState: "error" });

    expect(adapter.calls).toContain("unmount");
    expect(reports).toEqual([]);
    expect(recorder.calls).toEqual([]);
    expect(controller.retired).toBe(true);
  });

  it("is idempotent and turns every later command into a no-op", async () => {
    const recorder = createRecorder();
    const { adapter, controller, play, reports } = await createWatchedPlayer(
      recorder.options
    );
    play(0, 2);
    const first = controller.retire();
    expect(controller.retire()).toBe(first);
    await first;
    recorder.calls.length = 0;
    const calls = adapter.calls.length;
    const late: string[] = [];
    controller.subscribe(() => late.push("state"));
    controller.on("*", () => late.push("event"));

    await controller.mount(document.createElement("section"));
    await controller.load({ ...fileSource, id: "after-retire" });
    await controller.play();
    await controller.seekTo(30);
    await controller.setMuted(true);
    await controller.stop();
    controller.flushWatchedRanges("hidden");
    await controller.teardown();

    expect(adapter.calls.slice(calls)).toEqual([]);
    expect(controller.getState().currentSource).toBeNull();
    expect(controller.getState().snapshot.muted).toBe(false);
    expect([...reports, ...recorder.calls, ...late]).toEqual([]);
    expect(adapter.calls.filter((call) => call === "unmount")).toHaveLength(1);
  });

  it("stops the rest of a delivery when an observer retires the player", async () => {
    const seen: string[] = [];
    const { adapter, controller } = await createWatchedPlayer({
      onEvent: (event) => {
        seen.push(`host:${event.type}`);
        if (event.type === "play") {
          controller.retire().catch(() => undefined);
        }
      },
    });
    controller.on("play", () => seen.push("listener:play"));
    controller.subscribe(() => seen.push("state"));
    seen.length = 0;

    adapter.emit("play", { paused: false, readyState: "playing" });
    adapter.emit("timeupdate", { currentTime: 1 });

    expect(seen).not.toContain("listener:play");
    expect(seen.filter((entry) => entry.startsWith("host:"))).toEqual([
      "host:play",
    ]);
    await vi.runAllTimersAsync();
    expect(adapter.calls).toContain("unmount");
  });

  it("resolves even when the provider fails to release", async () => {
    const { adapter, controller } = await createWatchedPlayer();
    adapter.unmount = () => Promise.reject(new Error("Provider gone."));
    await expect(controller.retire()).resolves.toBeUndefined();
  });

  it("stays silent when it retires while a runaway subscriber is settled", async () => {
    const events: string[] = [];
    // Without an attached engine, volume changes update state synchronously.
    const controller = new VibePlayerController({
      adapterFactory: () => new TestAdapter(),
      onEvent: (event) => {
        if (controller.retired) {
          events.push(event.type);
        }
      },
    });
    await controller.load(fileSource, "onPlay");
    let volume = 0;
    let calls = 0;
    controller.subscribe(() => {
      calls += 1;
      // Past the delivery limit only the settle pass calls subscribers.
      if (calls > 1000) {
        controller.retire().catch(() => undefined);
        return;
      }
      volume = volume === 0.5 ? 0.25 : 0.5;
      controller.setVolume(volume).catch(() => undefined);
    });
    const late: string[] = [];
    controller.subscribe(() => {
      if (controller.retired) {
        late.push("state");
      }
    });

    await controller.setVolume(1);
    await vi.runAllTimersAsync();

    expect(controller.retired).toBe(true);
    expect(late).toEqual([]);
    expect(events).toEqual([]);
  });
});
