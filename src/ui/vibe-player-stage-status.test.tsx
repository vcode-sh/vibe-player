import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("keeps passive paused loading hidden after playback advanced", () => {
    const snapshot = createSnapshot({
      currentTime: 42,
      duration: 120,
      paused: true,
      readyState: "loading",
    });

    render(
      <VibePlayerStageStatus playbackBlocked={false} snapshot={snapshot} />
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders compact busy chrome while active playback buffers", () => {
    const snapshot = createSnapshot({
      paused: false,
      readyState: "buffering",
    });

    render(
      <VibePlayerStageStatus playbackBlocked={false} snapshot={snapshot} />
    );

    const status = screen.getByRole("status");
    expect(status).toHaveClass("vibe-player-stage__status--busy");
    expect(status).toHaveTextContent("Loading video");
    expect(
      status.querySelector(".vibe-player-stage__status-spinner")
    ).not.toBeNull();
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
