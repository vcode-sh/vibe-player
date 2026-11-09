import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import {
  EchoTestAdapter,
  fileSource,
  TestAdapter,
} from "./vibe-player-controller-test-helpers";
import type { VibePlayerEvent } from "./vibe-player-host-events";
import type { VibePlayerControllerState } from "./vibe-player-types";

function integrationOperations(events: VibePlayerEvent[]): unknown[] {
  return events.flatMap((event) =>
    event.type === "integrationerror" ? [event.error.details?.operation] : []
  );
}

async function createPlayer(adapter = new TestAdapter()) {
  const events: VibePlayerEvent[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onEvent: (event) => {
      events.push(event);
    },
  });
  await controller.load(fileSource, "onPlay");
  return { controller, events };
}

/** Changes the volume on every state it receives. */
function subscribeRunaway(controller: VibePlayerController): void {
  let volume = 0;
  controller.subscribe(() => {
    volume = volume === 0.5 ? 0.25 : 0.5;
    controller.setVolume(volume).catch(() => undefined);
  });
}

describe("ordered delivery overflow", () => {
  it.each(["before", "after"] as const)(
    "leaves a well-behaved subscriber %s a runaway one on the latest state",
    async (order) => {
      const { controller, events } = await createPlayer();
      let last: VibePlayerControllerState | null = null;
      const record = (state: VibePlayerControllerState) => {
        last = state;
      };
      if (order === "before") {
        controller.subscribe(record);
      }
      subscribeRunaway(controller);
      if (order === "after") {
        controller.subscribe(record);
      }

      await controller.setVolume(1);

      expect(last).toBe(controller.getState());
      expect(integrationOperations(events)).toEqual(["state-listener"]);
      await controller.teardown();
    }
  );

  it("never multiplies the bound when state and event loops nest", async () => {
    const adapter = new EchoTestAdapter();
    const { controller, events } = await createPlayer(adapter);
    await controller.activate();
    let calls = 0;
    let volume = 0;
    const nudge = () => {
      calls += 1;
      volume = volume === 0.5 ? 0.25 : 0.5;
      controller.setVolume(volume).catch(() => undefined);
    };
    controller.subscribe(nudge);
    controller.on("volumechange", nudge);

    await controller.setVolume(1);

    // Each delivery stops at 1000 per outer delivery and this volume change
    // runs two (states, then events); unbounded nesting made 2,002,000.
    expect(calls).toBeLessThan(5000);
    // Both listeners loop: each outer delivery reports its own looping one.
    expect(integrationOperations(events)).toEqual(["event", "state-listener"]);
    await controller.teardown();
  });

  it("reports a runaway in provider event processing once", async () => {
    const adapter = new TestAdapter();
    let seeks = 0;
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      // A host that makes the media seek again on every seek report.
      onAnalyticsEvent: (event) => {
        if (event.type === "seek") {
          seeks += 1;
          adapter.emit("seeking", { currentTime: (seeks % 50) + 1 });
        }
      },
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource);

    adapter.emit("seeking", { currentTime: 70, readyState: "buffering" });

    expect(seeks).toBeLessThan(1200);
    expect(integrationOperations(events)).toEqual(["provider-events"]);
    await controller.teardown();
  });

  it("names a state loop that runs inside an event delivery", async () => {
    const events: VibePlayerEvent[] = [];
    const adapter = new EchoTestAdapter();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource);
    let armed = false;
    let volume = 0;
    // Each state also queues an event, so the event delivery overflows too.
    controller.subscribe(() => {
      if (armed) {
        volume = volume === 0.5 ? 0.25 : 0.5;
        controller.setVolume(volume).catch(() => undefined);
      }
    });
    // The loop starts inside the delivery of a seeking event.
    controller.on("seeking", () => {
      armed = true;
      controller.setVolume(1).catch(() => undefined);
    });

    adapter.emit("seeking", { currentTime: 30, readyState: "buffering" });

    expect(integrationOperations(events)).toEqual(["state-listener"]);
    await controller.teardown();
  });

  it("keeps feeding provider events to trackers during a state runaway", async () => {
    const adapter = new TestAdapter();
    let reported = 0;
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onAnalyticsEvent: (event) => {
        if (event.type === "seek") {
          reported += 1;
        }
      },
    });
    await controller.load(fileSource);
    let emitted = 0;
    // Every state makes the media seek again, so states run away while
    // each seek reaches the raw feed in a drain of its own.
    controller.subscribe(() => {
      emitted += 1;
      adapter.emit("seeking", { currentTime: (emitted % 40) + 1 });
    });

    adapter.emit("timeupdate", { currentTime: 0.5 });

    expect(emitted).toBeGreaterThan(1000);
    expect(reported).toBe(emitted);
    await controller.teardown();
  });
});
