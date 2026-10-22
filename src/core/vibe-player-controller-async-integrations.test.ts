import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";

function createRejection() {
  let reject: (cause: Error) => void = () => undefined;
  const promise = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  promise.catch(() => undefined);
  return { promise, reject };
}

describe("controller asynchronous host failures", () => {
  it.each(["analytics", "state-listener", "resume-set"] as const)(
    "reports %s rejections without recursive diagnostic failures",
    async (operation) => {
      const adapter = new TestAdapter();
      const failure = createRejection();
      const diagnostic = {
        // biome-ignore lint/suspicious/noThenProperty: The host intentionally returns a rejecting thenable.
        then: vi.fn((_resolve: unknown, reject: (cause: Error) => void) => {
          reject(new Error("Diagnostic sink unavailable"));
        }),
      };
      const onError = vi.fn(() => diagnostic);
      const controller = new VibePlayerController({
        adapterFactory: () => adapter,
        onAnalyticsEvent: (event) => {
          if (operation === "analytics" && event.type === "started") {
            return failure.promise;
          }
        },
        onError,
        resumeStore: {
          clear: () => undefined,
          get: () => null,
          set: () => {
            if (operation === "resume-set") {
              return failure.promise;
            }
          },
        },
      });
      await controller.load(fileSource);
      if (operation === "state-listener") {
        controller.subscribe(() => failure.promise);
      }
      adapter.emit(operation === "resume-set" ? "timeupdate" : "play", {
        currentTime: 37,
        paused: false,
        readyState: "playing",
      });

      failure.reject(new Error("Host sink unavailable"));
      await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { operation },
          message: "Host sink unavailable",
          phase: "integration",
          sourceId: "video-1",
        })
      );
      await vi.waitFor(() => expect(diagnostic.then).toHaveBeenCalledTimes(1));
      expect(controller.getState().snapshot).toMatchObject({
        currentTime: 37,
        paused: false,
        readyState: "playing",
      });
      await controller.teardown();
    }
  );

  it("does not attach an old callback rejection to a replacement source", async () => {
    const first = new TestAdapter();
    const second = new TestAdapter();
    const failure = createRejection();
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: (source) => (source.id === "video-1" ? first : second),
      onAnalyticsEvent: (event) => {
        if (event.type === "started") {
          return failure.promise;
        }
      },
      onError,
    });
    await controller.load(fileSource);
    first.emit("play", { paused: false, readyState: "playing" });
    await controller.load({ ...fileSource, id: "video-2" });

    failure.reject(new Error("Previous telemetry request failed"));
    await failure.promise.catch(() => undefined);

    expect(onError).not.toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      currentSource: { id: "video-2" },
      error: null,
      snapshot: { readyState: "ready" },
    });
    await controller.teardown();
  });
});
