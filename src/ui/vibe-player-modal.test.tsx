import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIdleCapabilities,
  createIdleSnapshot,
  type VibePlayerAdapter,
  type VibePlayerAdapterEvent,
  type VibePlayerFileSource,
  type VibePlayerSnapshot,
  type VibePlayerSource,
} from "../core";
import { VibePlayerModal } from "./vibe-player-modal";

const source: VibePlayerFileSource = {
  id: "modal-video",
  posterUrl: "https://example.com/poster.jpg",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  title: "Modal demo",
  type: "file",
};

class TestModalAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities = {
    ...createIdleCapabilities(),
    canSeek: true,
    supportsDuration: true,
    supportsMute: true,
  };
  readonly kind = "file";
  private readonly snapshot: VibePlayerSnapshot = {
    ...createIdleSnapshot(),
    duration: 90,
    readyState: "ready",
  };

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  load(nextSource: VibePlayerSource): Promise<void> {
    this.calls.push(`load:${nextSource.id}`);
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.calls.push("mount");
    target.append(document.createElement("video"));
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

describe("VibePlayerModal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps rendered during close transition and then unmounts", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <VibePlayerModal open={true}>Modal content</VibePlayerModal>
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
    rerender(<VibePlayerModal open={false}>Modal content</VibePlayerModal>);
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "data-state",
      "closing"
    );

    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    vi.useRealTimers();
  });

  it("calls onClose for outside pointer down", () => {
    const onClose = vi.fn();
    render(
      <VibePlayerModal onClose={onClose} open={true}>
        Modal content
      </VibePlayerModal>
    );

    fireEvent.pointerDown(
      screen
        .getByRole("dialog")
        .querySelector(".vibe-player-modal__panel") as Element
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("loads source through the shared stage", async () => {
    const adapters: TestModalAdapter[] = [];
    const adapterFactory = () => {
      const adapter = new TestModalAdapter();
      adapters.push(adapter);
      return adapter;
    };

    render(
      <VibePlayerModal
        adapterFactory={adapterFactory}
        open={true}
        source={source}
      />
    );

    await waitFor(() =>
      expect(adapters[0]?.calls).toContain("load:modal-video")
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
