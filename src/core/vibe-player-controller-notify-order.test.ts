import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import {
  EchoTestAdapter,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerEvent } from "./vibe-player-host-events";
import type { VibePlayerControllerState } from "./vibe-player-types";

function describeState({ lastEvent, snapshot }: VibePlayerControllerState) {
  return `${lastEvent}:${snapshot.muted ? "muted" : "sound"}`;
}

describe("VibePlayerController state notification order", () => {
  it("delivers every state in order when a subscriber changes state", async () => {
    const adapter = new EchoTestAdapter();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
    });
    await controller.load(fileSource);
    const first: string[] = [];
    const second: string[] = [];
    controller.subscribe((state) => {
      first.push(describeState(state));
      if (state.lastEvent === "seeking") {
        controller.setMuted(true).catch(() => undefined);
      }
    });
    controller.subscribe((state) => {
      second.push(describeState(state));
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });
    adapter.emit("seeked", { currentTime: 30, readyState: "ready" });

    const expected = ["seeking:sound", "volumechange:muted", "seeked:muted"];
    expect(first).toEqual(expected);
    expect(second).toEqual(expected);
    expect(controller.getState().snapshot.muted).toBe(true);
    await controller.teardown();
  });

  it("stops a subscriber that keeps changing state and reports it once", async () => {
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => new TestAdapter(),
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource, "onPlay");
    let volume = 0;
    controller.subscribe(() => {
      volume = volume === 0.5 ? 0.25 : 0.5;
      controller.setVolume(volume).catch(() => undefined);
    });

    await controller.setVolume(1);

    expect(events).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          details: { operation: "state-listener" },
          phase: "integration",
        }),
        type: "integrationerror",
      }),
    ]);
    expect(controller.getState().snapshot.volume).toBe(volume);
    await controller.teardown();
  });
});
