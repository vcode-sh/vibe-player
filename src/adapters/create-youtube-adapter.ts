import { clampVibePlayerTime } from "../core/vibe-player-time";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import { clearElement } from "./native-video-dom";
import {
  getYouTubeCapabilities,
  getYouTubeSnapshot,
} from "./youtube-adapter-state";
import { defaultYouTubeAdapterRuntime } from "./youtube-iframe-runtime";
import {
  type YouTubeAdapterRuntime,
  type YouTubePlayerHandle,
  type YouTubePlayerState,
  youtubePlayerStates,
} from "./youtube-iframe-types";

type VibePlayerAdapterListener = (event: VibePlayerAdapterEvent) => void;

export function createYouTubeAdapter(
  runtime: YouTubeAdapterRuntime = defaultYouTubeAdapterRuntime
): VibePlayerAdapter {
  return new YouTubeVibePlayerAdapter(runtime);
}

class YouTubeVibePlayerAdapter implements VibePlayerAdapter {
  readonly kind = "youtube";
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly runtime: YouTubeAdapterRuntime;
  private mountElement: HTMLElement | null = null;
  private player: YouTubePlayerHandle | null = null;
  private playerState: YouTubePlayerState = youtubePlayerStates.unstarted;
  private source: VibePlayerYouTubeSource | null = null;
  private target: HTMLElement | null = null;
  private timeupdateInterval: number | null = null;

  constructor(runtime: YouTubeAdapterRuntime) {
    this.runtime = runtime;
  }

  get capabilities(): VibePlayerCapabilities {
    return getYouTubeCapabilities(this.player, this.source);
  }

  getSnapshot(): VibePlayerSnapshot {
    return getYouTubeSnapshot(this.player, this.playerState);
  }

  async load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "youtube") {
      throw new Error(`YouTube adapter cannot load ${source.type} sources.`);
    }
    this.destroyPlayer();
    this.source = source;
    this.playerState = youtubePlayerStates.unstarted;
    const mountElement = this.createMountElement();
    this.mountElement = mountElement;
    this.target?.append(mountElement);
    this.player = await this.runtime.createPlayer({
      element: mountElement,
      onError: (payload) => this.emit("error", payload),
      onPlaybackRateChange: () => this.emit("ratechange"),
      onReady: () => this.emit("ready"),
      onStateChange: (state) => this.handleStateChange(state),
      ...(source.startSeconds === undefined
        ? {}
        : { startSeconds: source.startSeconds }),
      videoId: source.youtubeVideoId,
    });
  }

  mount(target: HTMLElement): Promise<void> {
    this.target = target;
    clearElement(target);
    if (this.mountElement) {
      target.append(this.mountElement);
    }
    this.emit("ready");
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this.player?.pauseVideo();
    return Promise.resolve();
  }

  play(): Promise<void> {
    this.player?.playVideo();
    return Promise.resolve();
  }

  seekTo(seconds: number): Promise<void> {
    const player = this.player;
    if (!player) {
      return Promise.resolve();
    }
    const time = clampVibePlayerTime(
      seconds,
      this.getSnapshot().duration,
      false
    );
    player.seekTo(time, true);
    this.emit("timeupdate");
    return Promise.resolve();
  }

  setMuted(value: boolean): Promise<void> {
    if (value) {
      this.player?.mute();
    } else {
      this.player?.unMute();
    }
    this.emit("volumechange");
    return Promise.resolve();
  }

  setPlaybackRate(value: number): Promise<void> {
    this.player?.setPlaybackRate(value);
    this.emit("ratechange");
    return Promise.resolve();
  }

  setVolume(value: number): Promise<void> {
    this.player?.setVolume(Math.min(100, Math.max(0, value * 100)));
    this.emit("volumechange");
    return Promise.resolve();
  }

  async enterFullscreen(): Promise<void> {
    await this.player?.getIframe?.()?.requestFullscreen?.();
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
    this.destroyPlayer();
    this.mountElement?.remove();
    this.mountElement = null;
    this.target = null;
    return Promise.resolve();
  }

  private createMountElement(): HTMLElement {
    const target = this.target;
    if (target) {
      clearElement(target);
    }
    const element = document.createElement("div");
    element.className =
      "vibe-player-youtube-adapter-mount vibe-player-youtube-adapter-frame";
    return element;
  }

  private destroyPlayer(): void {
    this.stopTimeUpdates();
    this.player?.destroy();
    this.player = null;
    this.mountElement?.remove();
    this.mountElement = null;
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

  private handleStateChange(state: YouTubePlayerState): void {
    this.playerState = state;
    if (state === youtubePlayerStates.playing) {
      this.startTimeUpdates();
      this.emit("play");
      return;
    }
    this.stopTimeUpdates();
    if (state === youtubePlayerStates.paused) {
      this.emit("pause");
      return;
    }
    if (state === youtubePlayerStates.ended) {
      this.emit("ended");
    }
  }

  private startTimeUpdates(): void {
    if (this.timeupdateInterval) {
      return;
    }
    this.timeupdateInterval = window.setInterval(
      () => this.emit("timeupdate"),
      500
    );
  }

  private stopTimeUpdates(): void {
    if (!this.timeupdateInterval) {
      return;
    }
    window.clearInterval(this.timeupdateInterval);
    this.timeupdateInterval = null;
  }
}
