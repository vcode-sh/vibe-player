import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import { createNativeVideo } from "../native/native-video-dom";
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
  getHlsVideoCapabilities,
  getHlsVideoSnapshot,
} from "./hls-adapter-dom";
import { loadCurrentHlsAdapterSource } from "./hls-adapter-load-session";
import { createHlsAdapterQualityState } from "./hls-adapter-quality-state";
import { createHlsAdapterSessionState } from "./hls-adapter-session-state";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";
import type { ManagedHlsLevel } from "./hls-quality";
import type {
  HlsAdapterRuntime,
  ManagedHlsController,
} from "./hls-runtime-types";

/** Creates managed HLS with native fallback. Runtime injection is optional. */
export function createHlsAdapter(
  runtime: HlsAdapterRuntime = defaultHlsAdapterRuntime
): VibePlayerAdapter {
  return new HlsVibePlayerAdapter(runtime);
}
class HlsVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "hls";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly commandInput: NativeVideoCommandInput;
  private readonly session = createHlsAdapterSessionState();
  private readonly runtime: HlsAdapterRuntime;
  private readonly presentation = new NativeVideoPresentation((type) =>
    this.emit(type)
  );
  private managedHlsController: ManagedHlsController | null = null;
  private readonly quality = createHlsAdapterQualityState();
  private video: HTMLVideoElement | null = null;
  constructor(runtime: HlsAdapterRuntime) {
    this.runtime = runtime;
    this.commandInput = {
      canSeek: () => this.session.isSeekable,
      emit: (type) => this.emit(type),
      getPlaybackGeneration: () => this.session.playbackGeneration,
      getSnapshot: () => this.getSnapshot(),
      getVideo: () => this.video,
      incrementPlaybackGeneration: () =>
        this.session.incrementPlaybackGeneration(),
      isMounted: () => this.session.mounted,
    };
  }

  get capabilities(): VibePlayerCapabilities {
    const capabilities = getHlsVideoCapabilities(
      this.video,
      this.session.source,
      this.session.live,
      this.quality.supportsSelection
    );
    return {
      ...capabilities,
      canFullscreen:
        capabilities.supportsPlayback &&
        this.presentation.fullscreen.canFullscreen,
    };
  }

  getSnapshot(): VibePlayerSnapshot {
    const snapshot = getHlsVideoSnapshot(this.video, this.session.live);
    return {
      ...snapshot,
      ...this.presentation.getSnapshot(),
      readyState: this.session.failed ? "error" : snapshot.readyState,
      ...(this.quality.options.length
        ? { qualityOptions: this.quality.options }
        : {}),
    };
  }

  async load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "hls") {
      throw new Error(`HLS adapter cannot load ${source.type} sources.`);
    }

    const video = this.ensureVideo();
    this.destroyManagedHls();
    const loadSession = this.session.beginLoad(source);

    const controller = await loadCurrentHlsAdapterSource({
      emit: (type, payload) => this.emit(type, payload),
      isCurrentLoadSession: (session) =>
        this.session.isCurrentLoadSession(session),
      loadSession,
      runtime: this.runtime,
      setLive: (isLive) => this.session.setLive(isLive),
      source,
      updateQualityOptions: (levels, selectedLevelIndex) =>
        this.updateQualityOptions(levels, selectedLevelIndex),
      video,
    });
    if (this.session.isCurrentLoadSession(loadSession)) {
      this.managedHlsController = controller;
    }
  }

  mount(
    target: HTMLElement,
    presentationTarget: HTMLElement = target
  ): Promise<void> {
    const video = this.ensureVideo();
    this.session.markMounted();
    this.presentation.mount(video, presentationTarget);
    if (video.parentElement === target) {
      return Promise.resolve();
    }
    clearElement(target);
    target.append(video);
    this.emit("ready");
    return Promise.resolve();
  }

  pause = () => pauseNativeVideo(this.commandInput);
  play = () => playNativeVideo(this.commandInput);
  seekTo = (seconds: number) => seekNativeVideo(this.commandInput, seconds);
  setMuted = (value: boolean) => setNativeVideoMuted(this.commandInput, value);
  setPlaybackRate = (value: number) =>
    setNativeVideoPlaybackRate(this.commandInput, value);
  setVolume = (value: number) => setNativeVideoVolume(this.commandInput, value);
  enterFullscreen = () => this.presentation.fullscreen.enter();
  enterPictureInPicture = () => this.presentation.enterPictureInPicture();
  exitFullscreen = () => this.presentation.fullscreen.exit();
  exitPictureInPicture = () => this.presentation.exitPictureInPicture();

  setQuality(qualityId: string): Promise<void> {
    if (this.quality.select(qualityId, this.managedHlsController)) {
      this.emit("qualitychange");
    }
    return Promise.resolve();
  }

  subscribe(listener: VibePlayerAdapterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  unmount(): Promise<void> {
    const cleanup = this.presentation.unmount();
    this.session.close();
    if (this.video) {
      clearNativeVideoPlayback(this.video);
    }
    this.destroyManagedHls();
    this.video = null;
    return cleanup;
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
    if (type === "error" && payload?.fatal === true) {
      this.session.markFailed();
    }
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
    const video = createNativeVideo((event, payload) => {
      if (this.video === video) {
        this.emit(event, payload);
      }
    });
    this.video = video;
    return video;
  }
}
