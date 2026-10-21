import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerAnalyticsEvent } from "./vibe-player-types";

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("controller source replacement", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(["resolve", "reject"] as const)(
    "keeps the current source when an obsolete provider load settles with %s",
    async (settlement) => {
      const first = new TestAdapter();
      const second = new TestAdapter();
      const started = deferred();
      const pending = deferred();
      const analytics: VibePlayerAnalyticsEvent[] = [];
      vi.spyOn(first, "load").mockImplementation(() => {
        started.resolve();
        return pending.promise;
      });
      const controller = new VibePlayerController({
        adapterFactory: (source) => (source.id === "video-1" ? first : second),
        onAnalyticsEvent: (event) => analytics.push(event),
      });
      const firstLoad = controller.load(fileSource);
      await started.promise;
      await controller.load({ ...fileSource, id: "video-2" });
      const failure = new Error("Old provider failed");
      const settled =
        settlement === "reject"
          ? expect(firstLoad).rejects.toBe(failure)
          : firstLoad;
      if (settlement === "reject") {
        pending.reject(failure);
      } else {
        pending.resolve();
      }
      await settled;
      first.emit("error", { currentTime: 88, readyState: "error" });

      expect(controller.getState()).toMatchObject({
        currentSource: { id: "video-2" },
        lastEvent: "ready",
        snapshot: { currentTime: 0, readyState: "ready" },
      });
      expect(analytics.filter((event) => event.type === "opened")).toEqual([
        { provider: "file", sourceId: "video-2", type: "opened" },
      ]);
      expect(analytics.filter((event) => event.type === "error")).toEqual([]);
      await controller.teardown();
    }
  );
});
