import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerCapabilities,
  VibePlayerEventName,
  VibePlayerSnapshot,
  VibePlayerSource,
  VibePlayerYouTubeSource,
} from "../../core/vibe-player-types";
import { createAdapterFullscreen } from "../shared/adapter-fullscreen";
import type { VibePlayerAdapterListener } from "../shared/adapter-listener";
import { clearElement } from "../shared/clear-element";
import { YouTubeAdapterCommandDelegate } from "./youtube-adapter-command-delegate";
import type { YouTubeAdapterCommandInput } from "./youtube-adapter-commands";
import { loadYouTubePlayer } from "./youtube-adapter-load";
import { mountYouTubeElement } from "./youtube-adapter-mount";
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
import { YouTubePlaybackIntent } from "./youtube-playback-intent";
import { YouTubeTimeUpdates } from "./youtube-time-updates";

/** Creates iframe playback. Unmount discards pending players, not subscriptions. */
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
  private readonly fullscreen = createAdapterFullscreen((type) =>
    this.emit(type)
  );
  private readonly listeners = new Set<VibePlayerAdapterListener>();
  private readonly playbackIntent = new YouTubePlaybackIntent({
    emitPlayBlocked: () => this.emit("playblocked"),
    hasPlayer: () => Boolean(this.player),
  });
  private readonly runtime: YouTubeAdapterRuntime;
  private readonly timeUpdates = new YouTubeTimeUpdates({
    onTimeUpdate: () => {
      this.playbackIntent.completeIfAdvanced(this.getSnapshot().currentTime);
      this.emit("timeupdate");
    },
  });
  private loadAbortController: AbortController | null = null;
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
      fullscreen: this.fullscreen,
      getPlayer: () => this.player,
      getSnapshot: () => this.getSnapshot(),
      playbackIntent: this.playbackIntent,
    };
  }

  get capabilities(): VibePlayerCapabilities {
    return getYouTubeCapabilities(
      this.player,
      this.source,
      this.fullscreen.canFullscreen
    );
  }

  getSnapshot(): VibePlayerSnapshot {
    return {
      ...getYouTubeSnapshot(this.player, this.playerState),
      isFullscreen: this.fullscreen.isFullscreen,
    };
  }

  async load(source: VibePlayerSource): Promise<void> {
    if (source.type !== "youtube") {
      throw new Error(`YouTube adapter cannot load ${source.type} sources.`);
    }
    this.destroyPlayer();
    this.source = source;
    const mountElement = this.createMountElement();
    this.mountElement = mountElement;
    this.target?.append(mountElement);
    const isCurrent = () => this.mountElement === mountElement;
    const abortController = new AbortController();
    this.loadAbortController = abortController;
    try {
      const player = await loadYouTubePlayer({
        abortController,
        element: mountElement,
        emit: (type, payload) => {
          if (isCurrent()) {
            this.emit(type, payload);
          }
        },
        handleAutoplayBlocked: () => {
          if (isCurrent()) {
            this.playbackIntent.reportBlocked();
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
        this.loadAbortController = null;
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

  mount(target: HTMLElement, presentationTarget?: HTMLElement): Promise<void> {
    mountYouTubeElement({
      mountElement: this.mountElement,
      player: this.player,
      previousTarget: this.target,
      target,
    });
    this.target = target;
    this.fullscreen.mount(presentationTarget ?? target);
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
    this.target = null;
    return this.fullscreen.unmount();
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
    this.loadAbortController?.abort();
    this.loadAbortController = null;
    this.playbackIntent.cancel();
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
      playbackIntent: this.playbackIntent,
      playerState: state,
      setPlayerState: (nextState) => {
        this.playerState = nextState;
      },
      startTimeUpdates: () => this.timeUpdates.start(),
      stopTimeUpdates: () => this.timeUpdates.stop(),
    });
  }
}
