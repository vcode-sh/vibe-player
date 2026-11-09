import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVibePlayerAudioFocusParticipant,
  getVibePlayerAudioFocusOwner,
  subscribeVibePlayerAudioFocus,
  type VibePlayerAudioFocusParticipant,
} from "./vibe-player-audio-focus";
import { countVibePlayerControllerRetireHooks } from "./vibe-player-controller-retirement";
import { createControllerHarness } from "./vibe-player-controller-test-helpers";

const owned: VibePlayerAudioFocusParticipant[] = [];
const subscriptions: (() => void)[] = [];

function join(group: string, onPause = vi.fn()) {
  const participant = createVibePlayerAudioFocusParticipant(group, onPause);
  owned.push(participant);
  return participant;
}

function watch(group?: string) {
  const owners: (VibePlayerAudioFocusParticipant | null)[] = [];
  subscriptions.push(
    subscribeVibePlayerAudioFocus((owner) => owners.push(owner), group)
  );
  return owners;
}

afterEach(() => {
  for (const unsubscribe of subscriptions.splice(0)) {
    unsubscribe();
  }
  for (const participant of owned.splice(0)) {
    participant.dispose();
  }
});

describe("observable audio focus", () => {
  it("reads and announces the owner of one group only", () => {
    const voice = join("thread");
    const video = join("thread");
    const elsewhere = join("sidebar");
    const owners = watch("thread");
    expect(getVibePlayerAudioFocusOwner("thread")).toBeNull();

    voice.claim();
    elsewhere.claim();
    video.claim();
    video.claim();
    expect(getVibePlayerAudioFocusOwner("thread")).toBe(video);
    expect(getVibePlayerAudioFocusOwner("sidebar")).toBe(elsewhere);

    voice.release();
    video.release();
    expect(owners).toEqual([voice, video, null]);
    expect(getVibePlayerAudioFocusOwner("thread")).toBeNull();
  });

  it("defaults to the player group and stops announcing after unsubscribe", () => {
    const player = join("default");
    const owners = watch();
    player.claim();
    subscriptions.pop()?.();
    player.dispose();
    expect(owners).toEqual([player]);
    expect(getVibePlayerAudioFocusOwner()).toBeNull();
  });

  it("delivers the latest owner when a listener takes focus meanwhile", () => {
    const voice = join("call");
    const video = join("call");
    const seen: (VibePlayerAudioFocusParticipant | null)[] = [];
    subscriptions.push(
      subscribeVibePlayerAudioFocus(() => {
        throw new Error("Listener failed.");
      }, "call"),
      subscribeVibePlayerAudioFocus((owner) => {
        if (owner === voice) {
          video.claim();
        }
      }, "call"),
      subscribeVibePlayerAudioFocus((owner) => seen.push(owner), "call")
    );

    expect(() => voice.claim()).not.toThrow();
    expect(getVibePlayerAudioFocusOwner("call")).toBe(video);
    expect(seen.at(-1)).toBe(video);
    expect(seen).not.toContain(null);
  });

  it("describes what the owner represents", () => {
    const { controller } = createControllerHarness();
    const player = createVibePlayerAudioFocusParticipant("described", vi.fn(), {
      controller,
      mediaSession: false,
    });
    owned.push(player);
    const host = join("described");
    expect(player).toMatchObject({
      controller,
      group: "described",
      mediaSession: false,
    });
    expect(host).toMatchObject({ controller: null, mediaSession: true });
  });

  it("drops a retired player's focus and refuses its later claims", async () => {
    const { controller } = createControllerHarness();
    const player = createVibePlayerAudioFocusParticipant("gone", vi.fn(), {
      controller,
    });
    owned.push(player);
    const owners = watch("gone");
    player.claim();
    await controller.retire();
    player.claim();
    expect(getVibePlayerAudioFocusOwner("gone")).toBeNull();
    expect(owners).toEqual([player, null]);
  });

  it("watches a player's retirement only while it holds focus", () => {
    const { controller } = createControllerHarness();
    const replaced = Array.from({ length: 4 }, (_, index) =>
      createVibePlayerAudioFocusParticipant(`churn-${index}`, vi.fn(), {
        controller,
      })
    );
    owned.push(...replaced);
    expect(countVibePlayerControllerRetireHooks(controller)).toBe(0);

    const [first, second] = replaced;
    first?.claim();
    expect(countVibePlayerControllerRetireHooks(controller)).toBe(1);
    const rival = join("churn-0");
    rival.claim();
    expect(countVibePlayerControllerRetireHooks(controller)).toBe(0);
    second?.claim();
    second?.release();
    expect(countVibePlayerControllerRetireHooks(controller)).toBe(0);
  });
});
