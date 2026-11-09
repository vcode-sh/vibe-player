import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerEvent } from "./vibe-player-host-events";

function createDeferredRejection() {
  let reject: (cause: Error) => void = () => undefined;
  const promise = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  return { promise, reject };
}

/**
 * A subscriber that keeps changing the volume until the overflow, then
 * returns `settleResult` from the settle call that follows.
 */
function subscribeSettleProbe(
  controller: VibePlayerController,
  settleResult: () => Promise<void>
): void {
  let calls = 0;
  let volume = 0;
  controller.subscribe(() => {
    calls += 1;
    if (calls === 1001) {
      return settleResult();
    }
    if (calls < 1001) {
      volume = volume === 0.5 ? 0.25 : 0.5;
      controller.setVolume(volume).catch(() => undefined);
    }
  });
}

function settleFailures(events: VibePlayerEvent[]) {
  return events.filter(
    (event) =>
      event.type === "integrationerror" &&
      event.error.cause instanceof Error &&
      event.error.cause.message === "Late settle failure"
  );
}

describe("failures of subscribers while states settle", () => {
  it("reports nothing for a state that had no source, even once one loaded", async () => {
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => new TestAdapter(),
      onEvent: (event) => {
        events.push(event);
      },
    });
    const late = createDeferredRejection();
    subscribeSettleProbe(controller, () => late.promise);

    await controller.setVolume(1);
    await controller.load(fileSource, "onPlay");
    late.reject(new Error("Late settle failure"));
    await Promise.resolve();
    await Promise.resolve();

    expect(settleFailures(events)).toEqual([]);
    await controller.teardown();
  });

  it("reports nothing to a new session of the same source", async () => {
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => new TestAdapter(),
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource, "onPlay");
    const late = createDeferredRejection();
    subscribeSettleProbe(controller, () => late.promise);

    await controller.setVolume(1);
    await controller.load(fileSource);
    late.reject(new Error("Late settle failure"));
    await Promise.resolve();
    await Promise.resolve();

    expect(settleFailures(events)).toEqual([]);
    await controller.teardown();
  });

  it("reports a late failure while the same session still plays", async () => {
    const events: VibePlayerEvent[] = [];
    const controller = new VibePlayerController({
      adapterFactory: () => new TestAdapter(),
      onEvent: (event) => {
        events.push(event);
      },
    });
    await controller.load(fileSource, "onPlay");
    const late = createDeferredRejection();
    subscribeSettleProbe(controller, () => late.promise);

    await controller.setVolume(1);
    late.reject(new Error("Late settle failure"));
    await Promise.resolve();
    await Promise.resolve();

    expect(settleFailures(events)).toHaveLength(1);
    await controller.teardown();
  });
});
