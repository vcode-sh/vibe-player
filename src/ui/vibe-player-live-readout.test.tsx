import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createIdleCapabilities,
  createIdleSnapshot,
  type VibePlayerCapabilities,
} from "../core";
import { VibePlayerBottomControls } from "./vibe-player-bottom-controls";

const remainingReadout = /^-/;

const playing = {
  ...createIdleCapabilities(),
  canSeek: true,
  supportsDuration: true,
  supportsMute: true,
  supportsPlayback: true,
};

function renderBar(
  capabilities: VibePlayerCapabilities,
  snapshot: { currentTime: number; duration: number }
) {
  render(
    <VibePlayerBottomControls
      capabilities={capabilities}
      captionsEnabled={false}
      chromeHidden={false}
      onSeek={() => undefined}
      onSetMuted={undefined}
      onSetPlaybackRate={() => undefined}
      onSetQuality={undefined}
      onSetVolume={undefined}
      onToggleCaptions={undefined}
      onToggleFullscreen={undefined}
      onToggleMute={() => undefined}
      onTogglePictureInPicture={undefined}
      onTogglePlay={() => undefined}
      snapshot={{ ...createIdleSnapshot(), ...snapshot }}
    />
  );
}

describe("bottom bar time readout", () => {
  it("shows no remaining time or timeline for a live stream", () => {
    renderBar(
      { ...playing, canSeek: false, isLive: true, supportsDuration: false },
      // A custom adapter may still report the live window as a duration.
      { currentTime: 42, duration: 3600 }
    );

    expect(screen.getByText("0:42")).toBeInTheDocument();
    expect(screen.queryByText(remainingReadout)).not.toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Seek" })).toBeNull();
  });

  it("shows the remaining time and timeline for on-demand media", () => {
    renderBar(playing, { currentTime: 25, duration: 100 });

    expect(screen.getByText("-1:15")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Seek" })).toBeInTheDocument();
  });

  it("hides the remaining time while the duration is unknown", () => {
    renderBar(
      { ...playing, supportsDuration: false },
      { currentTime: 0, duration: 0 }
    );

    expect(screen.queryByText("-0:00")).not.toBeInTheDocument();
  });

  it("shows the known duration of a source that has not loaded yet", () => {
    // A lazy player knows the duration from the source before loading it.
    renderBar(createIdleCapabilities(), { currentTime: 0, duration: 83 });

    expect(screen.getByText("-1:23")).toBeInTheDocument();
  });
});
