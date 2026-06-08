import { clampVibePlayerTime } from "../core/vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerFileSource,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../core/vibe-player-types";
import {
  clearElement,
  createFileVideo,
  getFileVideoCapabilities,
  getFileVideoSnapshot,
  setFileVideoSource,
} from "./file-adapter-dom";

type VibePlayerAdapterListener = (event: VibePlayerAdapterEvent) => void;

export function createFileAdapter(): VibePlayerAdapter {
  return new FileVibePlayerAdapter();
}

class FileVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "file";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private source: VibePlayerFileSource | null = null;
  private video: HTMLVideoElement | null = null;

  get capabilities(): VibePlayerCapabilities {
    return getFileVideoCapabilities(this.video, this.source);
  }

  getSnapshot(): VibePlayerSnapshot {
    return getFileVideoSnapshot(this.video);
  }

  load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "file") {
      return Promise.reject(
        new Error(`File adapter cannot load ${source.type} sources.`)
      );
    }
    const fileSource = source;
    const mediaSource = fileSource.sources[0];
    if (!mediaSource) {
      return Promise.reject(
        new Error("File source must include at least one media source.")
      );
    }

    this.source = fileSource;
    const video = this.ensureVideo();
    setFileVideoSource(video, fileSource);
    video.load();
    this.emit("ready");
    return Promise.resolve();
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
    if (!video) {
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
    this.video?.remove();
    return Promise.resolve();
  }

  private emit(type: VibePlayerEventName): void {
    const event: VibePlayerAdapterEvent = {
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
    const video = createFileVideo((event) => this.emit(event));
    this.video = video;
    return video;
  }
}
