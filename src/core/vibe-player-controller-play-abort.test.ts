import { describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerSnapshot } from "./vibe-player-types";

class PendingPlayAdapter extends TestAdapter {
  /** The media failed, but its error event has not been dispatched yet. */
  mediaFailed = false;
  rejectPlay: (cause: Error) => void = () => undefined;

  override getSnapshot(): VibePlayerSnapshot {
    const snapshot = super.getSnapshot();
    return this.mediaFailed ? { ...snapshot, readyState: "error" } : snapshot;
  }

  override play(): Promise<void> {
    this.calls.push("play");
    return new Promise<void>((_resolve, reject) => {
      this.rejectPlay = reject;
    });
  }
}

async function loadPendingPlay() {
  const adapter = new PendingPlayAdapter();
  const analytics: string[] = [];
  const onError = vi.fn();
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onAnalyticsEvent: (event) => analytics.push(event.type),
    onError,
  });
  await controller.load(fileSource);
  const play = controller.play();
  await vi.waitFor(() => expect(adapter.calls).toContain("play"));
  return { adapter, analytics, controller, onError, play };
}

function notSupported(): DOMException {
  return new DOMException(
    "The operation is not supported.",
    "NotSupportedError"
  );
}

describe("controller play interrupted by the media", () => {
  it("treats a pause the media made during a pending play as a pause", async () => {
    const { adapter, analytics, controller, onError, play } =
      await loadPendingPlay();
    // Native controls, a Picture-in-Picture window or the OS paused the media.
    adapter.emit("pause", { paused: true, readyState: "ready" });
    adapter.rejectPlay(new DOMException("play() interrupted", "AbortError"));

    await expect(play).resolves.toBeUndefined();
    expect(controller.getState()).toMatchObject({
      error: null,
      lastEvent: "pause",
      snapshot: { paused: true, readyState: "ready" },
    });
    expect(onError).not.toHaveBeenCalled();
    expect(analytics).not.toContain("error");
    await controller.teardown();
  });

  it("still reports an aborted play while the media keeps playing", async () => {
    const { adapter, analytics, controller, play } = await loadPendingPlay();
    adapter.emit("playing", { paused: false, readyState: "playing" });
    const cause = new DOMException("Media aborted", "AbortError");
    adapter.rejectPlay(cause);

    await expect(play).rejects.toBe(cause);
    expect(controller.getState().error).toMatchObject({
      cause,
      kind: "unknown",
    });
    expect(analytics).toContain("error");
    await controller.teardown();
  });

  it.each([
    { kind: "source", name: "NotSupportedError" },
    { kind: "unknown", name: "Error" },
  ])("reports a $name play rejection as $kind", async ({ kind, name }) => {
    const { adapter, controller, play } = await loadPendingPlay();
    const cause = new Error("Play rejected");
    cause.name = name;
    adapter.rejectPlay(cause);

    await expect(play).rejects.toBe(cause);
    expect(controller.getState().error?.kind).toBe(kind);
    await controller.teardown();
  });

  it("leaves a media failure that rejects play() first to its error event", async () => {
    const { adapter, analytics, controller, onError, play } =
      await loadPendingPlay();
    // Some engines reject play() before they dispatch the media error.
    adapter.mediaFailed = true;
    adapter.rejectPlay(notSupported());
    await expect(play).resolves.toBeUndefined();
    adapter.emit(
      "error",
      { readyState: "error" },
      { fatal: true, kind: "source" }
    );

    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ details: { fatal: true, kind: "source" } })
    );
    expect(analytics.filter((type) => type === "error")).toHaveLength(1);
    await controller.teardown();
  });

  it("reports play() on media that had already failed", async () => {
    const adapter = new PendingPlayAdapter();
    const onError = vi.fn();
    const controller = new VibePlayerController({
      adapterFactory: () => adapter,
      onError,
    });
    await controller.load(fileSource);
    adapter.mediaFailed = true;
    const play = controller.play();
    await vi.waitFor(() => expect(adapter.calls).toContain("play"));
    const cause = notSupported();
    adapter.rejectPlay(cause);

    await expect(play).rejects.toBe(cause);
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ cause, details: { command: "play" } })
    );
    await controller.teardown();
  });
});
