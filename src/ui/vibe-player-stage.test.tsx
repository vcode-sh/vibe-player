import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerFileSource,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../core";
import { createIdleCapabilities, createIdleSnapshot } from "../core";
import { VibePlayerStage } from "./vibe-player-stage";

const fileSource: VibePlayerFileSource = {
  id: "stage-video",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  title: "Stage demo",
  type: "file",
};

class TestStageAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities: VibePlayerCapabilities = {
    ...createIdleCapabilities(),
    canFullscreen: true,
    canPictureInPicture: true,
    canSeek: true,
    canSetPlaybackRate: true,
    supportsDuration: true,
    supportsMute: true,
  };
  readonly kind = "file";
  playError: Error | null = null;
  private listener: ((event: VibePlayerAdapterEvent) => void) | null = null;
  private snapshot: VibePlayerSnapshot = {
    ...createIdleSnapshot(),
    duration: 100,
    readyState: "ready",
  };

  enterFullscreen(): Promise<void> {
    this.calls.push("fullscreen");
    return Promise.resolve();
  }

  enterPictureInPicture(): Promise<void> {
    this.calls.push("pip");
    return Promise.resolve();
  }

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  load(source: VibePlayerSource): Promise<void> {
    this.calls.push(`load:${source.id}`);
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.calls.push("mount");
    target.append(document.createElement("video"));
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.calls.push("pause");
    this.snapshot = { ...this.snapshot, paused: true };
    this.listener?.({ snapshot: this.snapshot, type: "pause" });
    return Promise.resolve();
  }

  play(): Promise<void> {
    this.calls.push("play");
    if (this.playError) {
      return Promise.reject(this.playError);
    }
    this.snapshot = { ...this.snapshot, paused: false };
    this.listener?.({ snapshot: this.snapshot, type: "play" });
    return Promise.resolve();
  }

  seekTo(seconds: number): Promise<void> {
    this.calls.push(`seek:${seconds}`);
    this.snapshot = { ...this.snapshot, currentTime: seconds };
    return Promise.resolve();
  }

  setMuted(value: boolean): Promise<void> {
    this.calls.push(`muted:${String(value)}`);
    return Promise.resolve();
  }

  setPlaybackRate(value: number): Promise<void> {
    this.calls.push(`rate:${value}`);
    return Promise.resolve();
  }

  setVolume(value: number): Promise<void> {
    this.calls.push(`volume:${value}`);
    return Promise.resolve();
  }

  subscribe(listener: (event: VibePlayerAdapterEvent) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  unmount(): Promise<void> {
    this.calls.push("unmount");
    return Promise.resolve();
  }
}

function getAdapter(adapters: TestStageAdapter[]): TestStageAdapter {
  const adapter = adapters[0];
  if (!adapter) {
    throw new Error("Missing stage test adapter.");
  }
  return adapter;
}

function createBlockedPlaybackError(): Error {
  const error = new Error("Playback blocked");
  error.name = "NotAllowedError";
  return error;
}

describe("VibePlayerStage", () => {
  it("autoplays on open and toggles playback from the media surface", async () => {
    const adapters: TestStageAdapter[] = [];
    const adapterFactory = () => {
      const adapter = new TestStageAdapter();
      adapters.push(adapter);
      return adapter;
    };

    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        onClose={vi.fn()}
        open={true}
        source={fileSource}
      />
    );

    await waitFor(() => expect(getAdapter(adapters).calls).toContain("play"));
    expect(container.querySelector(".vibe-player-stage")).toBe(
      document.activeElement
    );

    const media = container.querySelector(".vibe-player-stage__media");
    if (!(media instanceof HTMLElement)) {
      throw new Error("Missing stage media element.");
    }
    fireEvent.click(media);

    await waitFor(() => expect(getAdapter(adapters).calls).toContain("pause"));
  });

  it("clears the active source when closed", async () => {
    const adapters: TestStageAdapter[] = [];
    const adapterFactory = () => {
      const adapter = new TestStageAdapter();
      adapters.push(adapter);
      return adapter;
    };

    const { rerender } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={true}
        source={fileSource}
      />
    );

    await waitFor(() => expect(getAdapter(adapters).calls).toContain("play"));

    rerender(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={false}
        source={fileSource}
      />
    );

    await waitFor(() =>
      expect(getAdapter(adapters).calls).toContain("unmount")
    );
  });

  it("shows a blocked playback status after rejected autoplay", async () => {
    const adapterFactory = () => {
      const adapter = new TestStageAdapter();
      adapter.playError = createBlockedPlaybackError();
      return adapter;
    };

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay={true}
        open={true}
        source={fileSource}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Play to start")
    );
  });

  it("forwards picture-in-picture control actions", async () => {
    const adapters: TestStageAdapter[] = [];
    const adapterFactory = () => {
      const adapter = new TestStageAdapter();
      adapters.push(adapter);
      return adapter;
    };

    render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        open={true}
        source={fileSource}
      />
    );

    await waitFor(() =>
      expect(getAdapter(adapters).calls).toContain("load:stage-video")
    );
    fireEvent.click(screen.getByRole("button", { name: "Picture in picture" }));

    expect(getAdapter(adapters).calls).toContain("pip");
  });
});
