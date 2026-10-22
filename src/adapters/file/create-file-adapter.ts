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
  type NativeVideoCommandInput,
  pauseNativeVideo,
  playNativeVideo,
  seekNativeVideo,
  setNativeVideoMuted,
  setNativeVideoPlaybackRate,
  setNativeVideoVolume,
} from "../native/native-video-playback";
import { NativeVideoPresentation } from "../native/native-video-presentation";
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
  private readonly presentation = new NativeVideoPresentation((type) =>
    this.emit(type)
  );
  private mounted = false;
  private playbackGeneration = 0;
  private source: VibePlayerFileSource | null = null;
  private video: HTMLVideoElement | null = null;

  get capabilities(): VibePlayerCapabilities {
    const capabilities = getFileVideoCapabilities(this.video, this.source);
    return {
      ...capabilities,
      canFullscreen:
        capabilities.supportsPlayback &&
        this.presentation.fullscreen.canFullscreen,
    };
  }

  getSnapshot(): VibePlayerSnapshot {
    return {
      ...getFileVideoSnapshot(this.video),
      ...this.presentation.getSnapshot(),
    };
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

  mount(
    target: HTMLElement,
    presentationTarget: HTMLElement = target
  ): Promise<void> {
    const video = this.ensureVideo();
    this.mounted = true;
    this.presentation.mount(video, presentationTarget);
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
    await this.presentation.fullscreen.enter();
  }

  async enterPictureInPicture(): Promise<void> {
    await this.presentation.enterPictureInPicture();
  }

  async exitFullscreen(): Promise<void> {
    await this.presentation.fullscreen.exit();
  }

  exitPictureInPicture(): Promise<void> {
    return this.presentation.exitPictureInPicture();
  }

  subscribe(listener: VibePlayerAdapterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  unmount(): Promise<void> {
    const cleanup = this.presentation.unmount();
    this.mounted = false;
    this.playbackGeneration += 1;
    if (this.video) {
      clearNativeVideoPlayback(this.video);
    }
    this.source = null;
    this.video = null;
    return cleanup;
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
    const video = createFileVideo((event, payload) => {
      if (this.video === video) {
        this.emit(event, payload);
      }
    });
    this.video = video;
    return video;
  }
}
