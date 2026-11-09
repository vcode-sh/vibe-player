import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getVibePlayerAudioFocusOwner } from "../core/vibe-player-audio-focus";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import {
  installFakeMediaSession,
  uninstallFakeMediaSession,
} from "../core/vibe-player-media-session-test-helpers";
import { type UseVibePlayerOptions, useVibePlayer } from "./use-vibe-player";
import { useVibePlayerAudioFocus } from "./use-vibe-player-audio-focus";

const audible = {
  muted: false,
  paused: false,
  readyState: "playing",
  volume: 1,
} as const;

interface PairOptions {
  audioFocus: UseVibePlayerOptions["audioFocus"];
  firstSession?: UseVibePlayerOptions["mediaSession"];
  secondSession?: UseVibePlayerOptions["mediaSession"];
  voiceSession?: boolean;
}

/** Two players and one host voice note sharing whatever group is given. */
async function renderPair(options: PairOptions) {
  const first = new TestAdapter();
  const second = new TestAdapter();
  const firstFactory = () => first;
  const secondFactory = () => second;
  const { audioFocus } = options;
  const named = typeof audioFocus === "string" ? audioFocus : "default";
  const group =
    typeof audioFocus === "object" ? (audioFocus.group ?? "default") : named;
  const view = renderHook(() => ({
    first: useVibePlayer({
      adapterFactory: firstFactory,
      audioFocus: options.audioFocus,
      mediaSession: options.firstSession,
      source: { ...fileSource, id: "first", title: "First" },
    }),
    second: useVibePlayer({
      adapterFactory: secondFactory,
      audioFocus: options.audioFocus,
      mediaSession: options.secondSession,
      source: { ...fileSource, id: "second", title: "Second" },
    }),
    voice: useVibePlayerAudioFocus({
      group,
      mediaSession: options.voiceSession,
      onPause: vi.fn(),
    }),
  }));
  act(() => {
    view.result.current.first.setTarget(document.createElement("div"));
    view.result.current.second.setTarget(document.createElement("div"));
  });
  await waitFor(() =>
    expect(view.result.current.second.state.currentSource?.id).toBe("second")
  );
  return { first, second, view };
}

afterEach(uninstallFakeMediaSession);

describe("player audio focus options", () => {
  it("stops instead of pausing when onLose is stop, and exposes the owner", async () => {
    const { first, second, view } = await renderPair({
      audioFocus: { group: "stop-on-lose", onLose: "stop" },
    });
    act(() => first.emit("play", audible));
    await waitFor(() =>
      expect(getVibePlayerAudioFocusOwner("stop-on-lose")?.controller).toBe(
        view.result.current.first.controller
      )
    );

    act(() => second.emit("play", audible));
    await waitFor(() =>
      expect(view.result.current.first.state.snapshot.readyState).toBe("idle")
    );
    expect(first.calls).toContain("unmount");
    expect(first.calls).not.toContain("pause");
    expect(view.result.current.first.state.currentSource?.id).toBe("first");
    expect(getVibePlayerAudioFocusOwner("stop-on-lose")?.controller).toBe(
      view.result.current.second.controller
    );
    view.unmount();
    expect(getVibePlayerAudioFocusOwner("stop-on-lose")).toBeNull();
  });
});

describe("Media Session following audio focus", () => {
  it("releases a paused player's session when media without one takes focus", async () => {
    const page = installFakeMediaSession();
    const { first, view } = await renderPair({
      audioFocus: { group: "voice-thread" },
      firstSession: true,
      voiceSession: false,
    });
    act(() => first.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("First"));

    act(() => view.result.current.voice.claim());
    await waitFor(() =>
      expect(view.result.current.first.state.snapshot.paused).toBe(true)
    );
    expect(page.metadata).toBeNull();
    expect(page.actions).toEqual([]);
    view.unmount();
  });

  it("keeps the session for media that shows its own controls", async () => {
    const page = installFakeMediaSession();
    const { first, view } = await renderPair({
      audioFocus: { group: "own-controls" },
      firstSession: true,
    });
    act(() => first.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("First"));

    act(() => view.result.current.voice.claim());
    await waitFor(() =>
      expect(view.result.current.first.state.snapshot.paused).toBe(true)
    );
    expect(page.metadata?.title).toBe("First");
    view.unmount();
  });

  it("hands the session over between players and away from players without one", async () => {
    const page = installFakeMediaSession();
    const { first, second, view } = await renderPair({
      audioFocus: "handover",
      firstSession: true,
    });
    act(() => first.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("First"));

    act(() => second.emit("play", audible));
    await waitFor(() =>
      expect(view.result.current.first.state.snapshot.paused).toBe(true)
    );
    expect(page.metadata).toBeNull();

    await act(() => view.result.current.first.controller.play());
    act(() => first.emit("play", audible));
    await waitFor(() => expect(page.metadata?.title).toBe("First"));
    view.unmount();
  });
});
