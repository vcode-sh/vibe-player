import { describe, expect, it } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { createIdleCapabilities, createIdleSnapshot } from "./vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerEventName,
  VibePlayerFileSource,
  VibePlayerSnapshot,
} from "./vibe-player-types";

const fileSource: VibePlayerFileSource = {
  id: "video-1",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  type: "file",
};

class TestAdapter implements VibePlayerAdapter {
  readonly calls: string[] = [];
  readonly capabilities = { ...createIdleCapabilities(), canSeek: true };
  readonly kind: VibePlayerAdapter["kind"] = "file";
  private listener: ((event: VibePlayerAdapterEvent) => void) | null = null;
  private snapshot = createIdleSnapshot();

  emit(type: VibePlayerEventName, patch: Partial<VibePlayerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listener?.({ snapshot: this.snapshot, type });
  }

  getSnapshot(): VibePlayerSnapshot {
    return this.snapshot;
  }

  load(source: VibePlayerFileSource): Promise<void> {
    this.calls.push(`load:${source.id}`);
    this.snapshot = { ...this.snapshot, duration: 100, readyState: "ready" };
    return Promise.resolve();
  }

  mount(target: HTMLElement): Promise<void> {
    this.calls.push(`mount:${target.tagName.toLowerCase()}`);
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

function getAdapter(adapters: TestAdapter[], index: number): TestAdapter {
  const adapter = adapters[index];
  if (!adapter) {
    throw new Error(`Missing test adapter at index ${index}`);
  }
  return adapter;
}

function createControllerHarness(resumeAt: number | null = null) {
  const adapters: TestAdapter[] = [];
  const analytics: VibePlayerAnalyticsEvent[] = [];
  const resumeCalls: string[] = [];
  const resumeStore = {
    clear(sourceId: string) {
      resumeCalls.push(`clear:${sourceId}`);
    },
    get(sourceId: string) {
      resumeCalls.push(`get:${sourceId}`);
      return resumeAt;
    },
    set(sourceId: string, seconds: number) {
      resumeCalls.push(`set:${sourceId}:${seconds}`);
    },
  };
  const controller = new VibePlayerController({
    adapterFactory: () => {
      const adapter = new TestAdapter();
      adapters.push(adapter);
      return adapter;
    },
    onAnalyticsEvent: (event) => {
      analytics.push(event);
    },
    resumeStore,
  });
  return { adapters, analytics, controller, resumeCalls };
}

describe("VibePlayerController", () => {
  it("mounts, loads, and restores resume position", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness(12);
    const target = document.createElement("div");

    await controller.mount(target);
    await controller.load(fileSource);

    const adapter = getAdapter(adapters, 0);
    expect(adapter.calls).toEqual(["mount:div", "load:video-1", "seek:12"]);
    expect(controller.getState().snapshot.currentTime).toBe(12);
    expect(analytics.map((event) => event.type)).toEqual(["opened"]);
    expect(resumeCalls).toEqual(["get:video-1"]);
  });

  it("forwards playback commands through the active adapter", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);
    adapter.calls.length = 0;

    await controller.play();
    await controller.pause();
    await controller.seekTo(24);
    await controller.setMuted(true);
    await controller.setPlaybackRate(1.25);
    await controller.setVolume(0.4);

    expect(adapter.calls).toEqual([
      "play",
      "pause",
      "seek:24",
      "muted:true",
      "rate:1.25",
      "volume:0.4",
    ]);
    expect(analytics.map((event) => event.type)).toEqual(["opened", "seek"]);
    expect(resumeCalls).toContain("set:video-1:24");
  });

  it("emits session analytics once per milestone", async () => {
    const { adapters, analytics, controller, resumeCalls } =
      createControllerHarness();
    await controller.load(fileSource);
    const adapter = getAdapter(adapters, 0);

    adapter.emit("play", { currentTime: 1, paused: false });
    adapter.emit("play", { currentTime: 2, paused: false });
    adapter.emit("timeupdate", { currentTime: 26, duration: 100 });
    adapter.emit("timeupdate", { currentTime: 80, duration: 100 });
    adapter.emit("timeupdate", { currentTime: 80, duration: 100 });
    adapter.emit("ended", { currentTime: 100, readyState: "ended" });
    adapter.emit("ended", { currentTime: 100, readyState: "ended" });
    await controller.teardown();

    expect(analytics.map((event) => event.type)).toEqual([
      "opened",
      "started",
      "progress_25",
      "progress_50",
      "progress_75",
      "completed",
      "closed",
    ]);
    expect(resumeCalls).toContain("clear:video-1");
  });

  it("closes and unmounts the previous adapter when loading a new source", async () => {
    const { adapters, analytics, controller } = createControllerHarness();
    const nextSource: VibePlayerFileSource = { ...fileSource, id: "video-2" };

    await controller.load(fileSource);
    const firstAdapter = getAdapter(adapters, 0);
    await controller.load(nextSource);
    firstAdapter.emit("pause", { paused: true });

    expect(firstAdapter.calls).toContain("unmount");
    expect(controller.getState().currentSource?.id).toBe("video-2");
    expect(controller.getState().lastEvent).toBe("ready");
    expect(analytics.map((event) => event.type)).toEqual([
      "opened",
      "closed",
      "opened",
    ]);
  });
});
