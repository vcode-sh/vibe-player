import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerFileSource,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../../core/vibe-player-types";
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
} from "../native/native-video-playback";
import type { VibePlayerAdapterListener } from "../shared/adapter-listener";
import { clearElement } from "../shared/clear-element";
import {
  createFileVideo,
  getFileVideoCapabilities,
  getFileVideoSnapshot,
  setFileVideoSource,
} from "./file-adapter-dom";

/** Creates native file playback. Mount before loading; unsubscribe before disposal. */
export function createFileAdapter(): VibePlayerAdapter {
  return new FileVibePlayerAdapter();
}

class FileVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "file";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private mounted = false;
  private playbackGeneration = 0;
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
    const [mediaSource] = fileSource.sources;
    if (!mediaSource) {
      return Promise.reject(
        new Error("File source must include at least one media source.")
      );
    }

    this.source = fileSource;
    this.playbackGeneration += 1;
    const video = this.ensureVideo();
    setFileVideoSource(video, fileSource);
    video.load();
    this.emit("ready");
    return Promise.resolve();
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
    this.playbackGeneration += 1;
    if (this.video) {
      clearNativeVideoPlayback(this.video);
    }
    this.source = null;
    this.video = null;
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

  private getNativeCommandInput(): NativeVideoCommandInput {
    return {
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
    const video = createFileVideo((event) => {
      if (this.video === video) {
        this.emit(event);
      }
    });
    this.video = video;
    return video;
  }
}
