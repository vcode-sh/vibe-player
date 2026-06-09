import { describe, expect, it } from "vitest";
import { handleYouTubeAdapterStateChange } from "./youtube-adapter-state-change";
import {
  type YouTubePlayerState,
  youtubePlayerStates,
} from "./youtube-iframe-types";

function createStateChangeHarness(currentTime = 12) {
  const calls: string[] = [];
  let playerState: YouTubePlayerState = youtubePlayerStates.unstarted;
  return {
    calls,
    getState: () => playerState,
    handle: (nextState: YouTubePlayerState) =>
      handleYouTubeAdapterStateChange({
        emit: (type) => calls.push(`emit:${type}`),
        getCurrentTime: () => currentTime,
        playerState: nextState,
        setPlayerState: (state) => {
          playerState = state;
          calls.push(`state:${state}`);
        },
        startTimeUpdates: () => calls.push("time:start"),
        stopTimeUpdates: () => calls.push("time:stop"),
        watchdog: {
          cancelIfIdle: () => calls.push("watchdog:cancel-idle"),
          cancelIntent: () => calls.push("watchdog:cancel-intent"),
          completeIfAdvanced: (time) => calls.push(`watchdog:advance:${time}`),
          ensureScheduled: () => calls.push("watchdog:schedule"),
        },
      }),
  };
}

describe("handleYouTubeAdapterStateChange", () => {
  it("starts sampling and emits play for provider playing state", () => {
    const harness = createStateChangeHarness(14);

    harness.handle(youtubePlayerStates.playing);

    expect(harness.getState()).toBe(youtubePlayerStates.playing);
    expect(harness.calls).toEqual([
      "state:1",
      "watchdog:advance:14",
      "time:start",
      "emit:play",
    ]);
  });

  it("stops sampling and schedules watchdog for buffering", () => {
    const harness = createStateChangeHarness();

    harness.handle(youtubePlayerStates.buffering);

    expect(harness.calls).toEqual([
      "state:3",
      "watchdog:advance:12",
      "time:stop",
      "watchdog:schedule",
      "emit:buffering",
    ]);
  });

  it("normalizes terminal and idle provider states", () => {
    const paused = createStateChangeHarness();
    const ended = createStateChangeHarness();
    const queued = createStateChangeHarness();

    paused.handle(youtubePlayerStates.paused);
    ended.handle(youtubePlayerStates.ended);
    queued.handle(youtubePlayerStates.cued);

    expect(paused.calls.at(-1)).toBe("emit:pause");
    expect(ended.calls.at(-1)).toBe("emit:ended");
    expect(queued.calls.at(-1)).toBe("watchdog:cancel-idle");
  });
});
