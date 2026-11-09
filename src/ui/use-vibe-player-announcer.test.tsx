import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useVibePlayerAnnouncer,
  useVibePlayerStatusAnnouncement,
  VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS,
} from "./use-vibe-player-announcer";

interface Statuses {
  caption: string | null;
  playback: string | null;
}

/** Two status streams sharing one announcer, as the full stage wires them. */
function renderStatuses() {
  return renderHook(
    ({ caption, playback }: Statuses) => {
      const announcer = useVibePlayerAnnouncer();
      useVibePlayerStatusAnnouncement(announcer, playback);
      useVibePlayerStatusAnnouncement(announcer, caption);
      return announcer;
    },
    { initialProps: { caption: null, playback: null } as Statuses }
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("player announcer", () => {
  it("keeps both statuses that start in the same render", () => {
    const { rerender, result } = renderStatuses();
    rerender({ caption: "Captions unavailable", playback: "Buffering video" });
    expect(result.current.message).toBe(
      "Buffering video. Captions unavailable"
    );
  });

  it("speaks a text announced twice in one task once", () => {
    const { result } = renderStatuses();
    act(() => {
      result.current.announce("Paused");
      result.current.announce("Paused");
    });
    expect(result.current.message).toBe("Paused");
  });

  it("replaces the message when the next text comes in a later task", async () => {
    const { result } = renderStatuses();
    act(() => result.current.announce("Playing"));
    await act(async () => {
      await Promise.resolve();
      result.current.announce("Paused");
    });
    expect(result.current.message).toBe("Paused");
  });

  it("leaves a joined message to the timed clear when one status ends", () => {
    const { rerender, result } = renderStatuses();
    rerender({ caption: "Captions unavailable", playback: "Buffering video" });
    rerender({ caption: "Captions unavailable", playback: null });
    expect(result.current.message).toBe(
      "Buffering video. Captions unavailable"
    );
    act(() => {
      vi.advanceTimersByTime(VIBE_PLAYER_ANNOUNCEMENT_CLEAR_MS);
    });
    expect(result.current.message).toBe("");
  });
});
