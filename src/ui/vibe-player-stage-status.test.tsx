import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerSnapshot } from "../core";
import { VibePlayerStageStatus } from "./vibe-player-stage-status";

const baseSnapshot: VibePlayerSnapshot = {
  currentTime: 0,
  duration: 0,
  muted: false,
  paused: true,
  playbackRate: 1,
  readyState: "ready",
  volume: 1,
};

function createSnapshot(
  patch: Partial<VibePlayerSnapshot> = {}
): VibePlayerSnapshot {
  return { ...baseSnapshot, ...patch };
}

describe("VibePlayerStageStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps passive paused loading hidden after playback advanced", () => {
    const { rerender } = render(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          currentTime: 42,
          duration: 120,
          paused: true,
          readyState: "loading",
        })}
      />
    );

    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          currentTime: 0,
          duration: 0,
          paused: true,
          readyState: "loading",
        })}
      />
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("delays compact busy chrome for active playback buffers", () => {
    vi.useFakeTimers();
    const snapshot = createSnapshot({
      paused: false,
      readyState: "buffering",
    });

    render(
      <VibePlayerStageStatus playbackBlocked={false} snapshot={snapshot} />
    );

    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(319);
    });
    expect(screen.queryByRole("status")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    const status = screen.getByRole("status", { name: "Buffering video" });
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("gives a restarted buffer its full delay instead of reusing a cancelled timer", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          paused: false,
          readyState: "buffering",
        })}
      />
    );

    act(() => {
      vi.advanceTimersByTime(90);
    });
    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          paused: true,
          readyState: "loading",
        })}
      />
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole("status")).toBeNull();
    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({ paused: false, readyState: "buffering" })}
      />
    );
    act(() => vi.advanceTimersByTime(319));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("status", { name: "Buffering video" })
    ).toBeInTheDocument();
  });

  it("clears visible busy chrome as soon as playback pauses", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          paused: false,
          readyState: "buffering",
        })}
      />
    );

    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(
      screen.getByRole("status", { name: "Buffering video" })
    ).toBeInTheDocument();

    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          paused: true,
          readyState: "loading",
        })}
      />
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps blocked playback and errors readable", () => {
    const { rerender } = render(
      <VibePlayerStageStatus
        playbackBlocked={true}
        snapshot={createSnapshot()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Play to start");

    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({ readyState: "error" })}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Playback unavailable"
    );
  });
});
