import { act, render } from "@testing-library/react";
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

/** The standalone status, which is its own live region by default. */
function queryStatus(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".vibe-player-stage__status");
}

function getStatus(): HTMLElement {
  const status = queryStatus();
  if (!status) {
    throw new Error("Missing stage status.");
  }
  return status;
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

    expect(queryStatus()).toBeNull();

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

    expect(queryStatus()).toBeNull();
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

    expect(queryStatus()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(319);
    });
    expect(queryStatus()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    const status = getStatus();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    // A plain live section like the announcer: Orca 50 drops a status bar's
    // insertions that arrive within 100 ms of other page changes.
    expect(status).not.toHaveAttribute("role");
    // Live regions announce text content; an aria-label alone is not read.
    expect(status).not.toHaveAttribute("aria-label");
    expect(status).toHaveTextContent("Buffering video");
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
    expect(queryStatus()).toBeNull();
    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({ paused: false, readyState: "buffering" })}
      />
    );
    act(() => vi.advanceTimersByTime(319));
    expect(queryStatus()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(getStatus()).toHaveTextContent("Buffering video");
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
    expect(getStatus()).toHaveTextContent("Buffering video");

    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({
          paused: true,
          readyState: "loading",
        })}
      />
    );

    expect(queryStatus()).toBeNull();
  });

  it("keeps blocked playback and errors readable", () => {
    const { rerender } = render(
      <VibePlayerStageStatus
        playbackBlocked={true}
        snapshot={createSnapshot()}
      />
    );

    expect(getStatus()).toHaveTextContent("Play to start");

    rerender(
      <VibePlayerStageStatus
        playbackBlocked={false}
        snapshot={createSnapshot({ readyState: "error" })}
      />
    );

    expect(getStatus()).toHaveTextContent("Playback unavailable");
  });
});
