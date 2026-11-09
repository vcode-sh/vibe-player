import { describe, expect, expectTypeOf, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type {
  VibePlayerEvent,
  VibePlayerEventOfType,
  VibePlayerRenewEvent,
} from "./vibe-player-host-events";
import type { VibePlayerSource } from "./vibe-player-types";

/** Reports a mute change synchronously, as a native video element does. */
class MuteEchoAdapter extends TestAdapter {
  override setMuted(value: boolean): Promise<void> {
    this.emit("volumechange", { muted: value });
    return Promise.resolve();
  }
}

async function createPlayer(onEvent?: (event: VibePlayerEvent) => void) {
  const adapter = new MuteEchoAdapter();
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    ...(onEvent ? { onEvent } : {}),
  });
  await controller.load(fileSource);
  return { adapter, controller };
}

describe("VibePlayerController.on", () => {
  it("narrows listeners to their event type", async () => {
    const { controller } = await createPlayer();
    controller.on("seeked", (event) => {
      expectTypeOf(event.type).toEqualTypeOf<"seeked">();
      expectTypeOf(event.source).toEqualTypeOf<VibePlayerSource>();
      // @ts-expect-error playback events carry no previous source
      expectTypeOf(event.previousSource).toBeUnknown();
    });
    controller.on("renew", (event) => {
      expectTypeOf(event).toEqualTypeOf<VibePlayerRenewEvent>();
    });
    controller.on("*", (event) => {
      expectTypeOf(event).toEqualTypeOf<VibePlayerEvent>();
    });
    // @ts-expect-error "seek" is not an event type
    controller.on("seek", () => undefined);
    expectTypeOf<VibePlayerEventOfType<"integrationerror">>().toHaveProperty(
      "error"
    );
    await controller.teardown();
  });

  it("delivers matching events, every event for *, until unsubscribed", async () => {
    const { adapter, controller } = await createPlayer();
    const seeked: number[] = [];
    const all: string[] = [];
    const stopSeeked = controller.on("seeked", (event) => {
      seeked.push(event.snapshot.currentTime);
    });
    const stopAll = controller.on("*", (event) => {
      all.push(`${event.type}:${event.source.id}`);
    });

    adapter.emit("seeking", { currentTime: 12 });
    adapter.emit("seeked", { currentTime: 12 });
    stopSeeked();
    adapter.emit("seeked", { currentTime: 20 });
    stopAll();
    stopAll();
    adapter.emit("seeked", { currentTime: 30 });

    expect(seeked).toEqual([12]);
    expect(all).toEqual([
      "seeking:video-1",
      "seeked:video-1",
      "seeked:video-1",
    ]);
    await controller.teardown();
  });

  it("reports failing listeners as integration errors and keeps notifying", async () => {
    const events: VibePlayerEvent[] = [];
    const { adapter, controller } = await createPlayer((event) => {
      events.push(event);
    });
    const later: string[] = [];
    controller.on("seeked", () => {
      throw new Error("Listener failed");
    });
    controller.on("seeked", () =>
      Promise.reject(new Error("Listener rejected"))
    );
    controller.on("seeked", (event) => {
      later.push(event.type);
    });

    adapter.emit("seeked", { currentTime: 5, readyState: "ready" });
    await Promise.resolve();
    await Promise.resolve();

    expect(later).toEqual(["seeked"]);
    expect(
      events
        .filter((event) => event.type === "integrationerror")
        .map(({ error }) => [error.details, error.message])
    ).toEqual([
      [{ operation: "event-listener" }, "Listener failed"],
      [{ operation: "event-listener" }, "Listener rejected"],
    ]);
    expect(controller.getState().snapshot.currentTime).toBe(5);
    await controller.teardown();
  });

  it("delivers events in order when a listener causes another event", async () => {
    const received: string[] = [];
    const { adapter, controller } = await createPlayer((event) => {
      received.push(`onEvent:${event.type}`);
    });
    controller.on("seeking", () => {
      controller.setMuted(true).catch(() => undefined);
    });
    controller.on("*", (event) => {
      received.push(`on:${event.type}`);
    });

    adapter.emit("seeking", { currentTime: 30 });
    adapter.emit("seeked", { currentTime: 30 });

    expect(received).toEqual([
      "onEvent:seeking",
      "on:seeking",
      "onEvent:volumechange",
      "on:volumechange",
      "onEvent:seeked",
      "on:seeked",
    ]);
    await controller.teardown();
  });

  it("stops a listener that keeps causing events and reports it once", async () => {
    const events: VibePlayerEvent[] = [];
    const { controller } = await createPlayer((event) => {
      events.push(event);
    });
    controller.on("volumechange", (event) => {
      controller.setMuted(!event.snapshot.muted).catch(() => undefined);
    });

    await controller.setMuted(true);

    const errors = events.filter((event) => event.type === "integrationerror");
    expect(errors).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ details: { operation: "event" } }),
      }),
    ]);
    await controller.teardown();
  });
});
