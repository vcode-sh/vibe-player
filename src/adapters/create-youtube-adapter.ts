import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
  VibePlayerYouTubeSource,
} from "../core/vibe-player-types";
import type { VibePlayerAdapterListener } from "./adapter-listener";
import { clearElement } from "./native-video-dom";
import { YouTubeAdapterCommandDelegate } from "./youtube-adapter-command-delegate";
import type { YouTubeAdapterCommandInput } from "./youtube-adapter-commands";
import { loadYouTubePlayer } from "./youtube-adapter-load";
import {
  getYouTubeCapabilities,
  getYouTubeSnapshot,
} from "./youtube-adapter-state";
import { handleYouTubeAdapterStateChange } from "./youtube-adapter-state-change";
import { defaultYouTubeAdapterRuntime } from "./youtube-iframe-runtime";
import {
  type YouTubeAdapterRuntime,
  type YouTubePlayerHandle,
  type YouTubePlayerState,
  youtubePlayerStates,
} from "./youtube-iframe-types";
import { YouTubePlaybackWatchdog } from "./youtube-playback-watchdog";
import { YouTubeTimeUpdates } from "./youtube-time-updates";

export function createYouTubeAdapter(
  runtime: YouTubeAdapterRuntime = defaultYouTubeAdapterRuntime
): VibePlayerAdapter {
  return new YouTubeVibePlayerAdapter(runtime);
}

class YouTubeVibePlayerAdapter
  extends YouTubeAdapterCommandDelegate
  implements VibePlayerAdapter
{
  readonly kind = "youtube";
  protected readonly commandInput: YouTubeAdapterCommandInput;
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly playbackWatchdog = new YouTubePlaybackWatchdog({
    emitPlayBlocked: () => this.emit("playblocked"),
    hasPlayer: () => Boolean(this.player),
  });
  private readonly runtime: YouTubeAdapterRuntime;
  private readonly timeUpdates = new YouTubeTimeUpdates({
    onTimeUpdate: () => this.emitTimeUpdate(),
  });
  private mountElement: HTMLElement | null = null;
  private player: YouTubePlayerHandle | null = null;
  private playerState: YouTubePlayerState = youtubePlayerStates.unstarted;
  private source: VibePlayerYouTubeSource | null = null;
  private target: HTMLElement | null = null;

  constructor(runtime: YouTubeAdapterRuntime) {
    super();
    this.runtime = runtime;
    this.commandInput = {
      emit: (type) => this.emit(type),
      getPlayer: () => this.player,
      getSnapshot: () => this.getSnapshot(),
      watchdog: this.playbackWatchdog,
    };
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
    const isCurrent = () => this.mountElement === mountElement;
    try {
      const player = await loadYouTubePlayer({
        element: mountElement,
        emit: (type, payload) => {
          if (isCurrent()) {
            this.emit(type, payload);
          }
        },
        handleStateChange: (state) => {
          if (isCurrent()) {
            this.handleStateChange(state);
          }
        },
        runtime: this.runtime,
        source,
      });
      if (isCurrent()) {
        this.player = player;
      } else {
        player.destroy();
      }
    } catch (error) {
      if (isCurrent()) {
        this.destroyPlayer();
      }
      throw error;
    }
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
    if (this.target) {
      clearElement(this.target);
    }
    const element = document.createElement("div");
    element.className =
      "vibe-player-youtube-adapter-mount vibe-player-youtube-adapter-frame";
    return element;
  }

  private destroyPlayer(): void {
    this.playbackWatchdog.cancelIntent();
    this.timeUpdates.stop();
    this.player?.destroy();
    this.player = null;
    this.playerState = youtubePlayerStates.unstarted;
    this.source = null;
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
    handleYouTubeAdapterStateChange({
      emit: (type) => this.emit(type),
      getCurrentTime: () => this.getSnapshot().currentTime,
      playerState: state,
      setPlayerState: (nextState) => {
        this.playerState = nextState;
      },
      startTimeUpdates: () => this.timeUpdates.start(),
      stopTimeUpdates: () => this.timeUpdates.stop(),
      watchdog: this.playbackWatchdog,
    });
  }

  private emitTimeUpdate(): void {
    this.playbackWatchdog.completeIfAdvanced(this.getSnapshot().currentTime);
    this.emit("timeupdate");
  }
}
