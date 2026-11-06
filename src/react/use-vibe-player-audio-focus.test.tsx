import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";
import { useVibePlayerAudioFocus } from "./use-vibe-player-audio-focus";

describe("host and player audio focus", () => {
  it("lets muted playback coexist, claims on unmute, and yields to host audio", async () => {
    const first = new TestAdapter();
    const second = new TestAdapter();
    const firstFactory = () => first;
    const secondFactory = () => second;
    const pauseVoice = vi.fn();
    const { result, unmount } = renderHook(() => ({
      first: useVibePlayer({
        adapterFactory: firstFactory,
        audioFocus: "shared-media",
        source: fileSource,
      }),
      second: useVibePlayer({
        adapterFactory: secondFactory,
        audioFocus: "shared-media",
        source: fileSource,
      }),
      voice: useVibePlayerAudioFocus({
        group: "shared-media",
        onPause: pauseVoice,
      }),
    }));
    await act(() =>
      Promise.all([
        result.current.first.controller.load(fileSource),
        result.current.second.controller.load(fileSource),
      ])
    );
    act(() =>
      first.emit("play", {
        muted: false,
        paused: false,
        readyState: "playing",
        volume: 0.8,
      })
    );
    act(() =>
      second.emit("play", {
        muted: true,
        paused: false,
        readyState: "playing",
        volume: 1,
      })
    );
    expect(result.current.first.state.snapshot.paused).toBe(false);
    expect(first.calls).not.toContain("pause");

    act(() => second.emit("volumechange", { muted: false }));
    await waitFor(() =>
      expect(result.current.first.state.snapshot.paused).toBe(true)
    );
    expect(result.current.second.state.snapshot.paused).toBe(false);

    act(() => result.current.voice.claim());
    await waitFor(() =>
      expect(result.current.second.state.snapshot.paused).toBe(true)
    );
    await act(() => result.current.first.controller.play());
    act(() =>
      first.emit("play", { muted: false, paused: false, readyState: "playing" })
    );
    expect(pauseVoice).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("keeps the host participant stable while using its latest pause callback", () => {
    const previous = vi.fn();
    const latest = vi.fn();
    const pauseNext = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ onPause }) => ({
        host: useVibePlayerAudioFocus({ group: "host-callback", onPause }),
        next: useVibePlayerAudioFocus({
          group: "host-callback",
          onPause: pauseNext,
        }),
      }),
      { initialProps: { onPause: previous } }
    );
    act(() => result.current.host.claim());
    rerender({ onPause: latest });
    act(() => result.current.next.claim());
    expect(previous).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    unmount();
  });
});
