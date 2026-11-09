import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileSource } from "./vibe-player-controller-test-helpers";
import {
  createWatchedPlayer,
  type WatchedPlayer,
} from "./vibe-player-watched-test-helpers";

/** A playback id is a non-empty string. */
const playbackIdPattern = /\S/;

function identities({ reports }: WatchedPlayer) {
  return reports.map(({ playbackId, reason, sequence }) => ({
    playbackId,
    reason,
    sequence,
  }));
}

function endAt100({ adapter, play }: WatchedPlayer) {
  play(98, 100);
  adapter.emit("ended", { paused: true, readyState: "ended" });
}

describe("VibePlayerController watched-range playback identity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    { renewSource: undefined, way: "retry" },
    {
      renewSource: () =>
        Promise.resolve({ ...fileSource, expiresAt: Date.now() + 600_000 }),
      way: "renewal",
    },
  ])(
    "numbers one playback's reports from 1 across pause and $way",
    async ({ renewSource }) => {
      const player = await createWatchedPlayer({ renewSource });
      player.play(0, 3);
      player.pause();
      player.play(3, 5);
      await player.controller.retry();
      player.play(5, 7);
      player.pause();
      const [first] = identities(player);
      expect(first?.playbackId).toEqual(
        expect.stringMatching(playbackIdPattern)
      );
      expect(identities(player)).toEqual([
        { playbackId: first?.playbackId, reason: "pause", sequence: 1 },
        { playbackId: first?.playbackId, reason: "reload", sequence: 2 },
        { playbackId: first?.playbackId, reason: "pause", sequence: 3 },
      ]);
      await player.controller.teardown();
    }
  );

  it.each([
    { source: fileSource, which: "the same source again" },
    { source: { ...fileSource, id: "video-2" }, which: "another source" },
  ])("starts a new playback when the host loads $which", async ({ source }) => {
    const player = await createWatchedPlayer();
    player.play(0, 2);
    player.pause();
    player.play(2, 3);
    await player.controller.load(source);
    player.play(0, 1);
    player.pause();
    const [first, closed, next] = identities(player);
    expect(closed).toEqual({
      playbackId: first?.playbackId,
      reason: "close",
      sequence: 2,
    });
    expect(next).toMatchObject({ reason: "pause", sequence: 1 });
    expect(next?.playbackId).not.toBe(first?.playbackId);
    expect(player.reports[2]?.sourceId).toBe(source.id);
    await player.controller.teardown();
  });

  it.each<[string, (player: WatchedPlayer) => Promise<void> | void]>([
    ["the controller", ({ controller }) => controller.play()],
    [
      "the media",
      ({ adapter }) => adapter.emit("play", { currentTime: 0, paused: false }),
    ],
  ])(
    "starts a new playback when %s plays again after the end",
    async (_, replay) => {
      const player = await createWatchedPlayer();
      endAt100(player);
      await replay(player);
      player.play(0, 2);
      player.pause();
      const [ended, replayed] = identities(player);
      expect(ended).toMatchObject({ reason: "ended", sequence: 1 });
      expect(replayed).toMatchObject({ reason: "pause", sequence: 1 });
      expect(replayed?.playbackId).not.toBe(ended?.playbackId);
      await player.controller.teardown();
    }
  );

  it("starts a new playback when a renewal returns another source id", async () => {
    const player = await createWatchedPlayer({
      renewSource: () => Promise.resolve({ ...fileSource, id: "video-2" }),
    });
    player.play(0, 3);
    await player.controller.retry();
    player.play(3, 5);
    player.pause();
    const [reloaded, renewed] = player.reports;
    expect(reloaded).toMatchObject({
      reason: "reload",
      sequence: 1,
      sourceId: "video-1",
    });
    expect(renewed).toMatchObject({
      reason: "pause",
      sequence: 1,
      sourceId: "video-2",
    });
    expect(renewed?.playbackId).not.toBe(reloaded?.playbackId);
    await player.controller.teardown();
  });

  it("keeps the playback when media plays on before its end", async () => {
    const player = await createWatchedPlayer();
    player.play(0, 2);
    player.pause();
    player.adapter.emit("play", { paused: false });
    player.play(2, 4);
    player.pause();
    const [first, second] = identities(player);
    expect(second).toEqual({ ...first, sequence: 2 });
    await player.controller.teardown();
  });

  it.each([
    { crypto: undefined, page: "without Web Crypto" },
    {
      crypto: { getRandomValues: <T>(array: T) => array },
      page: "in an insecure context (no randomUUID)",
    },
  ])("gives every playback a distinct id $page", async ({ crypto }) => {
    vi.stubGlobal("crypto", crypto);
    const players = [await createWatchedPlayer(), await createWatchedPlayer()];
    for (const player of players) {
      endAt100(player);
      player.adapter.emit("play", { currentTime: 0, paused: false });
      player.play(0, 1);
      player.pause();
    }
    const ids = players.flatMap((player) =>
      player.reports.map((report) => report.playbackId)
    );
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    await Promise.all(players.map((player) => player.controller.teardown()));
  });
});
