import type {
  YouTubeIframeApi,
  YouTubeIframePlayerOptions,
  YouTubePlayerHandle,
} from "./youtube-iframe-types";

/** SDK boundary: the real iframe API permits handle queries only after onReady. */
export class DelayedYouTubePlayer implements YouTubePlayerHandle {
  readonly iframe = document.createElement("iframe");
  readonly actions: string[] = [];
  destroyed = false;
  private ready = false;
  private readonly options: YouTubeIframePlayerOptions;

  constructor(element: HTMLElement, options: YouTubeIframePlayerOptions) {
    this.options = options;
    element.replaceWith(this.iframe);
  }

  signalReady(): void {
    this.ready = true;
    this.options.events.onReady();
  }

  destroy(): void {
    this.destroyed = true;
    this.iframe.remove();
  }

  getCurrentTime(): number {
    return this.read(23.5);
  }
  getDuration(): number {
    return this.read(213);
  }
  getIframe(): HTMLIFrameElement {
    return this.read(this.iframe);
  }
  getPlaybackRate(): number {
    return this.read(1);
  }
  getVolume(): number {
    return this.read(67);
  }
  isMuted(): boolean {
    return this.read(false);
  }
  mute(): void {
    this.command("mute");
  }
  pauseVideo(): void {
    this.command("pause");
  }
  playVideo(): void {
    this.command("play");
  }
  seekTo(seconds: number): void {
    this.command(`seek:${seconds}`);
  }
  setPlaybackRate(value: number): void {
    this.command(`rate:${value}`);
  }
  setVolume(value: number): void {
    this.command(`volume:${value}`);
  }
  unMute(): void {
    this.command("unmute");
  }

  private read<T>(value: T): T {
    if (!this.ready) {
      throw new Error("YouTube SDK queried before onReady.");
    }
    return value;
  }

  private command(action: string): void {
    this.read(undefined);
    this.actions.push(action);
  }
}

export function createDelayedYouTubeApi() {
  let player: DelayedYouTubePlayer | null = null;
  class Player extends DelayedYouTubePlayer {
    constructor(element: HTMLElement, options: YouTubeIframePlayerOptions) {
      super(element, options);
      player = this;
    }
  }
  const api: YouTubeIframeApi = { Player };
  return {
    api,
    getPlayer(): DelayedYouTubePlayer {
      if (!player) {
        throw new Error("Expected iframe SDK constructor to run.");
      }
      return player;
    },
  };
}
