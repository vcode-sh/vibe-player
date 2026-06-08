import { clampVibePlayerTime } from "../core/vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerHlsSource,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../core/vibe-player-types";
import {
  canUseNativeHls,
  getHlsVideoCapabilities,
  getHlsVideoSnapshot,
  setHlsVideoSource,
} from "./hls-adapter-dom";
import { clearElement, createNativeVideo } from "./native-video-dom";

type VibePlayerAdapterListener = (event: VibePlayerAdapterEvent) => void;
type ManagedHlsTeardown = () => void;

export interface HlsAdapterErrorPayload
  extends Record<string, boolean | string> {
  details: string;
  fatal: boolean;
  message: string;
  type: string;
}

export interface ManagedHlsSession {
  manifestUrl: string;
  onError: (payload: HlsAdapterErrorPayload) => void;
  onLevelLoaded: (isLive: boolean) => void;
  onReady: () => void;
  video: HTMLVideoElement;
}

export interface HlsAdapterRuntime {
  attachManagedHls(
    session: ManagedHlsSession
  ): ManagedHlsTeardown | Promise<ManagedHlsTeardown>;
  canUseManagedHls(): boolean;
}

const defaultHlsAdapterRuntime: HlsAdapterRuntime = {
  async attachManagedHls(session) {
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      throw new Error("hls.js is not supported in this environment.");
    }
    const hls = new Hls();
    hls.on(Hls.Events.MANIFEST_PARSED, () => session.onReady());
    hls.on(Hls.Events.LEVEL_LOADED, (_event, data) =>
      session.onLevelLoaded(data.details.live)
    );
    hls.on(Hls.Events.ERROR, (_event, data) =>
      session.onError({
        details: data.details,
        fatal: data.fatal,
        message: data.error.message,
        type: data.type,
      })
    );
    hls.attachMedia(session.video);
    hls.loadSource(session.manifestUrl);
    return () => hls.destroy();
  },
  canUseManagedHls: () =>
    "ManagedMediaSource" in globalThis || "MediaSource" in globalThis,
};

export function createHlsAdapter(
  runtime: HlsAdapterRuntime = defaultHlsAdapterRuntime
): VibePlayerAdapter {
  return new HlsVibePlayerAdapter(runtime);
}

class HlsVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "hls";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly runtime: HlsAdapterRuntime;
  private managedHlsTeardown: (() => void) | null = null;
  private source: VibePlayerHlsSource | null = null;
  private video: HTMLVideoElement | null = null;
  private live = false;

  constructor(runtime: HlsAdapterRuntime) {
    this.runtime = runtime;
  }

  get capabilities(): VibePlayerCapabilities {
    return getHlsVideoCapabilities(this.video, this.source, this.live);
  }

  getSnapshot(): VibePlayerSnapshot {
    return getHlsVideoSnapshot(this.video, this.live);
  }

  async load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "hls") {
      throw new Error(`HLS adapter cannot load ${source.type} sources.`);
    }

    const video = this.ensureVideo();
    const nativeHls = canUseNativeHls(video);
    if (!(nativeHls || this.runtime.canUseManagedHls())) {
      throw new Error(
        "HLS playback requires native HLS or MediaSource support."
      );
    }

    this.destroyManagedHls();
    this.source = source;
    this.live = Boolean(source.live);
    setHlsVideoSource(video, source, nativeHls ? "native" : "managed");

    if (nativeHls) {
      video.load();
      this.emit("ready");
      return;
    }

    video.load();
    this.managedHlsTeardown = await this.runtime.attachManagedHls({
      manifestUrl: source.manifestUrl,
      onError: (payload) => this.emit("error", payload),
      onLevelLoaded: (isLive) => {
        this.live = isLive;
        this.emit("durationchange");
      },
      onReady: () => this.emit("ready"),
      video,
    });
  }

  mount(target: HTMLElement): Promise<void> {
    const video = this.ensureVideo();
    if (video.parentElement !== target) {
      clearElement(target);
      target.append(video);
    }
    this.emit("ready");
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.video?.pause();
    return Promise.resolve();
  }

  async play(): Promise<void> {
    await this.video?.play();
  }

  seekTo(seconds: number): Promise<void> {
    const video = this.video;
    if (!(video && !this.live)) {
      return Promise.resolve();
    }
    video.currentTime = clampVibePlayerTime(
      seconds,
      this.getSnapshot().duration,
      false
    );
    this.emit("timeupdate");
    return Promise.resolve();
  }

  setMuted(value: boolean): Promise<void> {
    if (this.video) {
      this.video.muted = value;
      this.emit("volumechange");
    }
    return Promise.resolve();
  }

  setPlaybackRate(value: number): Promise<void> {
    if (this.video) {
      this.video.playbackRate = value;
      this.emit("ratechange");
    }
    return Promise.resolve();
  }

  setVolume(value: number): Promise<void> {
    if (this.video) {
      this.video.volume = Math.min(1, Math.max(0, value));
      this.emit("volumechange");
    }
    return Promise.resolve();
  }

  async enterFullscreen(): Promise<void> {
    await this.video?.requestFullscreen();
    this.emit("fullscreenchange");
  }

  async exitFullscreen(): Promise<void> {
    await document.exitFullscreen?.();
    this.emit("fullscreenchange");
  }

  subscribe(listener: VibePlayerAdapterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  unmount(): Promise<void> {
    this.video?.pause();
    this.destroyManagedHls();
    this.video?.remove();
    return Promise.resolve();
  }

  private destroyManagedHls(): void {
    this.managedHlsTeardown?.();
    this.managedHlsTeardown = null;
  }

  private emit(
    type: VibePlayerEventName,
    payload?: VibePlayerAdapterEvent["payload"]
  ): void {
    const event: VibePlayerAdapterEvent = {
      ...(payload ? { payload } : {}),
      snapshot: this.getSnapshot(),
      type,
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private ensureVideo(): HTMLVideoElement {
    if (this.video) {
      return this.video;
    }
    const video = createNativeVideo((event) => this.emit(event));
    this.video = video;
    return video;
  }
}
