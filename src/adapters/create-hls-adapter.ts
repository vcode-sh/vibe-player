import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerHlsSource,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../core/vibe-player-types";
import type { VibePlayerAdapterListener } from "./adapter-listener";
import {
  getHlsVideoCapabilities,
  getHlsVideoSnapshot,
} from "./hls-adapter-dom";
import { loadHlsAdapterSource } from "./hls-adapter-load";
import { createHlsAdapterQualityState } from "./hls-adapter-quality-state";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";
import type { ManagedHlsLevel } from "./hls-quality";
import type {
  HlsAdapterRuntime,
  ManagedHlsController,
} from "./hls-runtime-types";
import { clearElement, createNativeVideo } from "./native-video-dom";
import {
  clearNativeVideoPlayback,
  enterNativeVideoFullscreen,
  enterNativeVideoPictureInPicture,
  exitNativeVideoFullscreen,
  type NativeVideoCommandInput,
  pauseNativeVideo,
  playNativeVideo,
  seekNativeVideo,
  setNativeVideoMuted,
  setNativeVideoPlaybackRate,
  setNativeVideoVolume,
} from "./native-video-playback";

interface HlsAdapterLoadSession {
  generation: number;
}

export type * from "./hls-runtime-types";
export function createHlsAdapter(
  runtime: HlsAdapterRuntime = defaultHlsAdapterRuntime
): VibePlayerAdapter {
  return new HlsVibePlayerAdapter(runtime);
}
class HlsVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "hls";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly runtime: HlsAdapterRuntime;
  private loadGeneration = 0;
  private managedHlsController: ManagedHlsController | null = null;
  private mounted = false;
  private playbackGeneration = 0;
  private readonly quality = createHlsAdapterQualityState();
  private source: VibePlayerHlsSource | null = null;
  private video: HTMLVideoElement | null = null;
  private live = false;
  constructor(runtime: HlsAdapterRuntime) {
    this.runtime = runtime;
  }

  get capabilities(): VibePlayerCapabilities {
    return getHlsVideoCapabilities(
      this.video,
      this.source,
      this.live,
      this.quality.supportsSelection
    );
  }

  getSnapshot(): VibePlayerSnapshot {
    const snapshot = getHlsVideoSnapshot(this.video, this.live);
    if (this.quality.options.length === 0) {
      return snapshot;
    }
    return { ...snapshot, qualityOptions: this.quality.options };
  }

  async load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "hls") {
      throw new Error(`HLS adapter cannot load ${source.type} sources.`);
    }

    const video = this.ensureVideo();
    const loadSession = this.prepareLoadSession(source);
    let managedController: ManagedHlsController | null = null;

    try {
      managedController = await loadHlsAdapterSource({
        emit: (type, payload) => {
          if (this.isCurrentLoadSession(loadSession)) {
            this.emit(type, payload);
          }
        },
        isActive: () => this.isCurrentLoadSession(loadSession),
        runtime: this.runtime,
        setLive: (isLive) => {
          if (this.isCurrentLoadSession(loadSession)) {
            this.live = isLive;
          }
        },
        source,
        updateQualityOptions: (levels, selectedLevelIndex) => {
          if (this.isCurrentLoadSession(loadSession)) {
            this.updateQualityOptions(levels, selectedLevelIndex);
          }
        },
        video,
      });
    } catch (error) {
      if (this.isCurrentLoadSession(loadSession)) {
        throw error;
      }
      return;
    }

    if (!this.isCurrentLoadSession(loadSession)) {
      managedController?.destroy();
      return;
    }
    this.managedHlsController = managedController;
  }

  private prepareLoadSession(
    source: VibePlayerHlsSource
  ): HlsAdapterLoadSession {
    this.destroyManagedHls();
    this.source = source;
    this.loadGeneration += 1;
    this.playbackGeneration += 1;
    this.live = Boolean(source.live);
    return {
      generation: this.loadGeneration,
    };
  }

  private isCurrentLoadSession(loadSession: HlsAdapterLoadSession): boolean {
    return this.loadGeneration === loadSession.generation;
  }

  mount(target: HTMLElement): Promise<void> {
    const video = this.ensureVideo();
    this.mounted = true;
    if (video.parentElement === target) {
      return Promise.resolve();
    }
    clearElement(target);
    target.append(video);
    this.emit("ready");
    return Promise.resolve();
  }

  pause(): Promise<void> {
    return pauseNativeVideo(this.getNativeCommandInput());
  }

  async play(): Promise<void> {
    await playNativeVideo(this.getNativeCommandInput());
  }

  seekTo(seconds: number): Promise<void> {
    return seekNativeVideo(this.getNativeCommandInput(), seconds);
  }

  setMuted(value: boolean): Promise<void> {
    return setNativeVideoMuted(this.getNativeCommandInput(), value);
  }

  setPlaybackRate(value: number): Promise<void> {
    return setNativeVideoPlaybackRate(this.getNativeCommandInput(), value);
  }
  setQuality(qualityId: string): Promise<void> {
    if (this.quality.select(qualityId, this.managedHlsController)) {
      this.emit("qualitychange");
    }
    return Promise.resolve();
  }
  setVolume(value: number): Promise<void> {
    return setNativeVideoVolume(this.getNativeCommandInput(), value);
  }
  async enterFullscreen(): Promise<void> {
    await enterNativeVideoFullscreen(this.getNativeCommandInput());
  }

  async enterPictureInPicture(): Promise<void> {
    await enterNativeVideoPictureInPicture(this.getNativeCommandInput());
  }

  async exitFullscreen(): Promise<void> {
    await exitNativeVideoFullscreen(this.getNativeCommandInput());
  }

  subscribe(listener: VibePlayerAdapterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  unmount(): Promise<void> {
    this.mounted = false;
    this.loadGeneration += 1;
    this.playbackGeneration += 1;
    if (this.video) {
      clearNativeVideoPlayback(this.video);
    }
    this.destroyManagedHls();
    this.live = false;
    this.source = null;
    this.video = null;
    return Promise.resolve();
  }

  private destroyManagedHls(): void {
    this.managedHlsController?.destroy();
    this.managedHlsController = null;
    this.quality.reset();
  }
  private updateQualityOptions(
    levels: ManagedHlsLevel[],
    selectedLevelIndex: number
  ): void {
    this.quality.update(levels, selectedLevelIndex);
    this.emit("qualitychange");
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

  private getNativeCommandInput(): NativeVideoCommandInput {
    return {
      canSeek: () => !this.live,
      emit: (type) => this.emit(type),
      getPlaybackGeneration: () => this.playbackGeneration,
      getSnapshot: () => this.getSnapshot(),
      getVideo: () => this.video,
      incrementPlaybackGeneration: () => {
        this.playbackGeneration += 1;
        return this.playbackGeneration;
      },
      isMounted: () => this.mounted,
    };
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
