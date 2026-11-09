import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import {
  EchoTestAdapter,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerEvent } from "./vibe-player-host-events";

function integrationErrors(events: VibePlayerEvent[]) {
  return events.flatMap((event) =>
    event.type === "integrationerror" ? [event.error] : []
  );
}

/** A host that makes the media seek again on every seek it is told about. */
function createSeekingHost(adapter: TestAdapter) {
  let seeks = 0;
  const onAnalyticsEvent = (event: { type: string }) => {
    if (event.type === "seek") {
      seeks += 1;
      adapter.emit("seeking", { currentTime: (seeks % 50) + 1 });
    }
  };
  return { count: () => seeks, onAnalyticsEvent };
}

describe("nested delivery runaways", () => {
  it("bounds provider event loops nested in a state loop once, and reports both", async () => {
    const adapter = new TestAdapter();
    const host = createSeekingHost(adapter);
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent: host.onAnalyticsEvent,
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource);
    let states = 0;
    controller.subscribe(() => {
      states += 1;
      adapter.emit("seeking", { currentTime: (states % 40) + 60 });
    });

    adapter.emit("timeupdate", { currentTime: 0.5 });

    // The raw feed stops at its own cap (10 000), not cap x cap (1 000 000
    // before the per-outer-delivery bound).
    expect(host.count()).toBe(10_000);
    // Every delivery that was cut off is reported, the state loop included.
    expect(
      integrationErrors(events).map((error) => error.details?.operation)
    ).toEqual(["event", "provider-events", "state-listener"]);
    await controller.teardown();
  });

  it("delivers a release published while runaways settle", async () => {
    const adapter = new TestAdapter();
    const host = createSeekingHost(adapter);
    const saves: (string | undefined)[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent: host.onAnalyticsEvent,
      resumeStore: {
        clear: () => undefined,
        get: () => null,
        set: (_sourceId, _seconds, context) => {
          saves.push(context?.reason);
        },
      },
    });
    await controller.load(fileSource);
    adapter.emit("timeupdate", {
      currentTime: 1,
      paused: false,
      readyState: "playing",
    });
    let states = 0;
    let closed = false;
    controller.subscribe(() => {
      states += 1;
      // Past the state limit, this call is the settle after the overflow.
      if (states > 1000 && !closed) {
        closed = true;
        controller.closeSource().catch(() => undefined);
        return;
      }
      adapter.emit("seeking", { currentTime: (states % 40) + 60 });
    });

    adapter.emit("timeupdate", { currentTime: 1.25 });

    expect(closed).toBe(true);
    expect(saves).toContain("close");
    await controller.teardown();
  });

  it("reports a subscriber that throws while the overflow settles", async () => {
    const adapter = new EchoTestAdapter();
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource);
    let states = 0;
    let volume = 0;
    controller.subscribe(() => {
      states += 1;
      if (states > 1000) {
        throw new Error("Settle failure");
      }
      volume = volume === 0.5 ? 0.25 : 0.5;
      controller.setVolume(volume).catch(() => undefined);
    });

    await controller.setVolume(1);

    expect(
      integrationErrors(events).some(
        (error) =>
          error.cause instanceof Error &&
          error.cause.message === "Settle failure"
      )
    ).toBe(true);
    await controller.teardown();
  });
});
