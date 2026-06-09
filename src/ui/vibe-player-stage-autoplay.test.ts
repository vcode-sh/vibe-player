import { describe, expect, it } from "vitest";
import { createIdleSnapshot, type VibePlayerControllerState } from "../core";
import {
  startVibePlayerAutoplay,
  type VibePlayerAutoplayController,
} from "./vibe-player-stage-autoplay";

function createAutoplayController(muted = false): {
  calls: string[];
  controller: VibePlayerAutoplayController;
} {
  const calls: string[] = [];
  let state: VibePlayerControllerState = {
    capabilities: null,
    currentSource: null,
    isMounted: true,
    lastEvent: null,
    playbackBlocked: false,
    snapshot: { ...createIdleSnapshot(), muted },
  };
  return {
    calls,
    controller: {
      getState: () => state,
      play: () => {
        calls.push("play");
        return Promise.resolve();
      },
      setMuted: (value) => {
        calls.push(`muted:${String(value)}`);
        state = {
          ...state,
          snapshot: { ...state.snapshot, muted: value },
        };
        return Promise.resolve();
      },
    },
  };
}

describe("startVibePlayerAutoplay", () => {
  it("keeps muted bootstrap playback muted after start", async () => {
    const { calls, controller } = createAutoplayController(false);

    await startVibePlayerAutoplay({
      controller,
      isCancelled: () => false,
      mutedBootstrap: true,
    });

    expect(calls).toEqual(["muted:true", "play"]);
    expect(controller.getState().snapshot.muted).toBe(true);
  });

  it("does not remute sources that are already muted", async () => {
    const { calls, controller } = createAutoplayController(true);

    await startVibePlayerAutoplay({
      controller,
      isCancelled: () => false,
      mutedBootstrap: true,
    });

    expect(calls).toEqual(["play"]);
  });

  it("plays directly when muted bootstrap is disabled", async () => {
    const { calls, controller } = createAutoplayController(false);

    await startVibePlayerAutoplay({
      controller,
      isCancelled: () => false,
      mutedBootstrap: false,
    });

    expect(calls).toEqual(["play"]);
    expect(controller.getState().snapshot.muted).toBe(false);
  });
});
