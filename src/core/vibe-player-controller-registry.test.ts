import { afterEach, describe, expect, it } from "vitest";
import type { VibePlayerController } from "./vibe-player-controller";
import {
  getVibePlayerControllers,
  subscribeVibePlayerControllers,
} from "./vibe-player-controller-registry";
import {
  createControllerHarness,
  fileSource,
} from "./vibe-player-controller-test-helpers";

const created: VibePlayerController[] = [];
const subscriptions: (() => void)[] = [];

function createController(): VibePlayerController {
  const { controller } = createControllerHarness();
  created.push(controller);
  return controller;
}

function source(id: string) {
  return { ...fileSource, id };
}

/** Membership as the listener saw it, limited to this test's controllers. */
function watch(...mine: VibePlayerController[]) {
  const seen: boolean[][] = [];
  subscriptions.push(
    subscribeVibePlayerControllers((controllers) =>
      seen.push(mine.map((controller) => controllers.includes(controller)))
    )
  );
  return seen;
}

afterEach(async () => {
  for (const unsubscribe of subscriptions.splice(0)) {
    unsubscribe();
  }
  await Promise.all(created.splice(0).map((each) => each.teardown()));
});

describe("controller registry", () => {
  it("lists controllers while they have a source, filtered by source id", async () => {
    const first = createController();
    const second = createController();
    expect(getVibePlayerControllers()).not.toContain(first);

    await first.load(source("registry-shared"));
    await second.load(source("registry-shared"), "onPlay");
    expect(getVibePlayerControllers("registry-shared")).toEqual([
      first,
      second,
    ]);

    await second.load(source("registry-other"));
    expect(getVibePlayerControllers("registry-shared")).toEqual([first]);
    expect(getVibePlayerControllers("registry-other")).toEqual([second]);
    expect(getVibePlayerControllers()).toEqual(
      expect.arrayContaining([first, second])
    );

    await first.closeSource();
    await second.teardown();
    expect(getVibePlayerControllers()).not.toContain(first);
    expect(getVibePlayerControllers()).not.toContain(second);
  });

  it("drops a retired controller at once and never lists it again", async () => {
    const controller = createController();
    await controller.load(source("registry-retired"));
    const seen = watch(controller);

    const retiring = controller.retire();
    expect(getVibePlayerControllers("registry-retired")).toEqual([]);
    await retiring;
    await controller.load(source("registry-retired"));
    expect(getVibePlayerControllers("registry-retired")).toEqual([]);
    expect(seen).toEqual([[false]]);
  });

  it("announces joins, source changes and departures until unsubscribed", async () => {
    const controller = createController();
    const seen = watch(controller);
    await controller.load(source("registry-a"));
    await controller.load(source("registry-a"));
    const sourceIds: (string | undefined)[] = [];
    subscriptions.push(
      subscribeVibePlayerControllers(() =>
        sourceIds.push(controller.getState().currentSource?.id)
      )
    );
    await controller.load(source("registry-b"));
    await controller.closeSource();
    subscriptions.shift()?.();
    await controller.load(source("registry-c"));

    expect(seen).toEqual([[true], [true], [false]]);
    expect(sourceIds).toEqual(["registry-b", undefined, "registry-c"]);
  });
});
