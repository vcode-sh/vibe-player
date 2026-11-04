import { describe, expect, it, vi } from "vitest";
import { createIdleSnapshot, type VibePlayerControllerState } from "../core";
import {
  startVibePlayerAutoplay,
  type VibePlayerAutoplayController,
} from "./vibe-player-autoplay";

function createAutoplayController(muted = false): {
  calls: string[];
  controller: VibePlayerAutoplayController;
} {
  const calls: string[] = [];
  const state: VibePlayerControllerState = {
    capabilities: null,
    currentSource: null,
    error: null,
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
        return Promise.resolve();
      },
    },
  };
}

describe("startVibePlayerAutoplay", () => {
  it("does not start a source cancelled while muting is pending", async () => {
    const { controller } = createAutoplayController();
    let completeMute: (() => void) | undefined;
    const muting = new Promise<void>((resolve) => {
      completeMute = resolve;
    });
    const play = vi.fn(() => Promise.resolve());
    let cancelled = false;
    const setMuted = vi.fn(() => muting);
    const started = startVibePlayerAutoplay({
      controller: { ...controller, play, setMuted },
      isCancelled: () => cancelled,
      mutedBootstrap: true,
    });

    expect(setMuted).toHaveBeenCalledWith(true);
    expect(play).not.toHaveBeenCalled();
    cancelled = true;
    completeMute?.();
    await started;
    expect(play).not.toHaveBeenCalled();
  });

  it("mutes before playback without automatically unmuting", async () => {
    const { calls, controller } = createAutoplayController(false);

    await startVibePlayerAutoplay({
      controller,
      isCancelled: () => false,
      mutedBootstrap: true,
    });

    expect(calls).toEqual(["muted:true", "play"]);
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
  });
});
