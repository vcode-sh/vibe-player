import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  collectYouTubeAdapterEvents,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import { createDelayedYouTubeApi } from "./youtube-player-readiness-test-helpers";

async function startDefaultAdapter() {
  const { api, getPlayer } = createDelayedYouTubeApi();
  window.YT = api;
  const adapter = createYouTubeAdapter();
  const target = document.createElement("div");
  await adapter.mount(target);
  const pending = adapter.load(youtubeSource);
  const outcome = pending.catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(0);
  return { adapter, getPlayer, outcome, pending, player: getPlayer(), target };
}

describe("official YouTube player readiness", () => {
  afterEach(() => {
    window.YT = undefined;
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it("waits for SDK readiness before exposing handle reads or playback", async () => {
    vi.useFakeTimers();
    const { adapter, outcome, pending, player } = await startDefaultAdapter();
    let loaded = false;
    pending
      .then(() => {
        loaded = true;
      })
      .catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    try {
      expect(loaded).toBe(false);
      expect(adapter.getSnapshot()).toMatchObject({
        currentTime: 0,
        readyState: "idle",
      });
      await adapter.play();
      expect(player.actions).toEqual([]);
      player.signalReady();
      await pending;
      expect(adapter.getSnapshot()).toMatchObject({
        currentTime: 23.5,
        duration: 213,
        readyState: "ready",
        volume: 0.67,
      });
      await adapter.play();
      expect(player.actions).toEqual(["play"]);
    } finally {
      player.signalReady();
      await outcome;
      await adapter.unmount();
    }
  });

  it("destroys an unready SDK player at the creation deadline", async () => {
    vi.useFakeTimers();
    const { adapter, outcome, player, target } = await startDefaultAdapter();
    await vi.advanceTimersByTimeAsync(7999);
    expect(player.destroyed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({
      message: "Timed out creating YouTube player.",
    });
    expect(player.destroyed).toBe(true);
    expect(target.childElementCount).toBe(0);
    const events = collectYouTubeAdapterEvents(adapter);
    player.signalReady();
    expect(events).toEqual([]);
    expect(player.actions).toEqual([]);
    await outcome;
    await adapter.unmount();
  });

  it("keeps the replacement iframe when an aborted player signals readiness late", async () => {
    vi.useFakeTimers();
    const {
      adapter,
      getPlayer,
      outcome,
      player: old,
      target,
    } = await startDefaultAdapter();
    const replacement = adapter.load({
      ...youtubeSource,
      youtubeVideoId: "replacement",
    });
    await vi.advanceTimersByTimeAsync(0);
    const current = getPlayer();
    try {
      expect(old.destroyed).toBe(true);
      expect(current.destroyed).toBe(false);
      old.signalReady();
      current.signalReady();
      await replacement;
      expect(await outcome).toMatchObject({ name: "AbortError" });
      expect(target.querySelector("iframe")).toBe(current.iframe);
      await adapter.play();
      expect(current.actions).toEqual(["play"]);
      expect(old.actions).toEqual([]);
    } finally {
      current.signalReady();
      await replacement;
      await adapter.unmount();
    }
  });

  it("destroys pending SDK creation on unmount and ignores late readiness", async () => {
    vi.useFakeTimers();
    const { adapter, outcome, player, target } = await startDefaultAdapter();
    const events = collectYouTubeAdapterEvents(adapter);
    await adapter.unmount();
    expect(player.destroyed).toBe(true);
    expect(target.childElementCount).toBe(0);
    player.signalReady();
    await outcome;
    expect(events).toEqual([]);
    expect(player.actions).toEqual([]);
    expect(adapter.getSnapshot().readyState).toBe("idle");
  });

  it("forwards official autoplay blocks only from the current SDK session", async () => {
    vi.useFakeTimers();
    const {
      adapter,
      getPlayer,
      outcome,
      player: old,
    } = await startDefaultAdapter();
    old.signalReady();
    await outcome;
    const replacement = adapter.load({
      ...youtubeSource,
      youtubeVideoId: "replacement",
    });
    await vi.advanceTimersByTimeAsync(0);
    const current = getPlayer();
    current.signalReady();
    await replacement;
    const events = collectYouTubeAdapterEvents(adapter);
    try {
      await adapter.play();
      old.signalAutoplayBlocked();
      expect(events).toEqual([]);
      current.signalAutoplayBlocked();
      expect(events.map((event) => event.type)).toEqual(["playblocked"]);
    } finally {
      await adapter.unmount();
    }
  });

  it("moves the SDK iframe while creation is still waiting for readiness", async () => {
    vi.useFakeTimers();
    const { adapter, outcome, pending, player, target } =
      await startDefaultAdapter();
    const replacement = document.createElement("section");
    try {
      await adapter.mount(replacement);
      expect(replacement.querySelector("iframe")).toBe(player.iframe);
      expect(target.childElementCount).toBe(0);
      player.signalReady();
      await pending;
      expect(adapter.getSnapshot().currentTime).toBe(23.5);
      expect(player.destroyed).toBe(false);
    } finally {
      player.signalReady();
      await outcome;
      await adapter.unmount();
    }
  });
});
