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
import { VibePlayerInline } from "./vibe-player-inline";

const fileSource: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/captions.vtt",
    },
  ],
  id: "file-video",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  title: "Inline demo",
  type: "file",
};

class TestInlineAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities: VibePlayerCapabilities = {
    ...createIdleCapabilities(),
    canFullscreen: true,
    canSeek: true,
    canSetPlaybackRate: true,
    canShowCaptions: true,
    supportsDuration: true,
    supportsMute: true,
    supportsPlayback: true,
  };
  readonly kind = "file";
  private snapshot: VibePlayerSnapshot = {
    ...createIdleSnapshot(),
    currentTime: 1.5,
    duration: 100,
    readyState: "ready",
  };

  enterFullscreen(): Promise<void> {
    this.calls.push("fullscreen");
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
    const element = document.createElement("div");
    element.dataset.testid = "mounted-media";
    target.append(element);
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.calls.push("pause");
    return Promise.resolve();
  }

  play(): Promise<void> {
    this.calls.push("play");
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

  subscribe(_listener: (event: VibePlayerAdapterEvent) => void): () => void {
    return () => undefined;
  }

  unmount(): Promise<void> {
    this.calls.push("unmount");
    return Promise.resolve();
  }
}

function getAdapter(adapters: TestInlineAdapter[]): TestInlineAdapter {
  const [adapter] = adapters;
  if (!adapter) {
    throw new Error("Missing inline test adapter.");
  }
  return adapter;
}

describe("VibePlayerInline", () => {
  it("connects caption controls and releases playback when its source is removed", async () => {
    const adapters: TestInlineAdapter[] = [];
    const adapterFactory = () => {
      const adapter = new TestInlineAdapter();
      adapters.push(adapter);
      return adapter;
    };
    const loadCaptionText = vi.fn(() =>
      Promise.resolve(`WEBVTT

00:00:01.000 --> 00:00:02.000
Caption line`)
    );

    const { rerender } = render(
      <VibePlayerInline
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        source={fileSource}
      />
    );

    await waitFor(() =>
      expect(getAdapter(adapters).calls).toContain("load:file-video")
    );
    await waitFor(() =>
      expect(screen.getByText("Caption line")).toBeInTheDocument()
    );

    expect(getAdapter(adapters).calls).not.toContain("play");
    fireEvent.click(screen.getByRole("button", { name: "Hide captions" }));
    expect(screen.queryByText("Caption line")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show captions" }));
    await waitFor(() =>
      expect(screen.getByText("Caption line")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    fireEvent.click(screen.getByRole("button", { name: "Playback speed 1x" }));
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));

    expect(getAdapter(adapters).calls).toEqual(
      expect.arrayContaining(["play", "muted:true", "rate:1.25", "fullscreen"])
    );

    rerender(
      <VibePlayerInline adapterFactory={adapterFactory}>
        Choose a video
      </VibePlayerInline>
    );
    await waitFor(() =>
      expect(getAdapter(adapters).calls).toContain("unmount")
    );
    expect(screen.getByText("Choose a video")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(screen.queryByText("Caption line")).toBeNull();
  });
});
