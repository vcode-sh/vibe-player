import { VibePlayerControllerActions } from "./vibe-player-controller-actions";
import { dispatchVibePlayerAdapterEvent } from "./vibe-player-controller-dispatch";
import { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import { VibePlayerControllerRuntime } from "./vibe-player-controller-runtime";
import type {
  VibePlayerEventOfType,
  VibePlayerEventType,
} from "./vibe-player-host-events";
import {
  createVibePlayerPosterRenewal,
  type VibePlayerPosterRenewal,
} from "./vibe-player-poster-renewal";
import { VibePlayerRawFeed } from "./vibe-player-raw-feed";
import { VibePlayerSourceSession } from "./vibe-player-source-session";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerLoadMode,
  VibePlayerSource,
} from "./vibe-player-types";
import { VibePlayerWatchedRangesTracker } from "./vibe-player-watched-ranges";

/** Provider-neutral playback, renewable deliveries and explicit resource ownership. */
export class VibePlayerController {
  private readonly observers: VibePlayerControllerObservers;
  private readonly actions: VibePlayerControllerActions;
  private readonly session: VibePlayerSourceSession;
  private readonly runtime: VibePlayerControllerRuntime;
  private readonly poster: VibePlayerPosterRenewal;
  private readonly feed = new VibePlayerRawFeed();
  private readonly watched: VibePlayerWatchedRangesTracker | null = null;

  /** Creates an idle controller; nothing loads until `load()`. */
  constructor(options: VibePlayerControllerOptions) {
    this.observers = new VibePlayerControllerObservers(options);
    if (options.onWatchedRanges) {
      const watched = new VibePlayerWatchedRangesTracker(
        this.observers.emitWatchedRanges
      );
      this.watched = watched;
      this.feed.subscribe((entry) => watched.observe(entry));
    }
    this.runtime = new VibePlayerControllerRuntime({
      applyPreferences: () => this.actions.applyPreferences(),
      clearIntent: () => this.actions.clear(),
      event: (event) =>
        dispatchVibePlayerAdapterEvent(
          {
            actions: this.actions,
            feed: this.feed,
            observers: this.observers,
            runtime: this.runtime,
            session: this.session,
          },
          event
        ),
      feed: this.feed,
      isPlayRequested: () => this.session.playbackRequested,
      observers: this.observers,
      options,
    });
    this.actions = new VibePlayerControllerActions(
      {
        acknowledgePause: (snapshot) => {
          const source = this.observers.state.currentSource;
          if (source) {
            this.feed.command("pause", snapshot, source);
          }
        },
        adapter: () => this.runtime.adapter,
        emitAnalytics: this.observers.emitAnalytics,
        emitEvent: (event) => this.observers.emitEvent(event),
        generation: () => this.runtime.operationGeneration,
        state: () => this.observers.state,
        sync: () => this.runtime.syncFromAdapter(),
        update: (next) => this.runtime.updateState(next),
      },
      this.runtime.resumeStore
    );
    this.session = new VibePlayerSourceSession(
      {
        attach: (source) => this.runtime.attachSource(source),
        command: (command) => this.actions.playback(command),
        fail: (cause) => this.runtime.failRenewal(cause),
        getState: () => this.observers.state,
        hasAdapter: () => this.runtime.adapter !== null,
        prepare: (source) => this.runtime.prepareSource(source),
        renewed: (previous, source) => {
          const generation = this.runtime.operationGeneration;
          this.observers.renewed(previous, source, () =>
            this.runtime.isCurrentOperation(generation)
          );
        },
        renewing: (renewing) => {
          if (this.observers.state.renewing !== renewing) {
            this.observers.updateState({ renewing });
          }
        },
        restore: (snapshot) => this.actions.restore(snapshot),
        suspend: (loading) => this.runtime.suspend(loading),
      },
      options
    );
    this.poster = createVibePlayerPosterRenewal({
      idleSource: () =>
        this.runtime.adapter ? null : this.observers.state.currentSource,
      renewSource: () => options.renewSource,
      replace: (previous, next) => {
        if (this.session.replaceIdle(previous, next)) {
          this.observers.updateState({ currentSource: next });
          this.observers.renewed(previous, next);
        }
      },
    });
  }

  /** The latest normalized state. */
  getState(): VibePlayerControllerState {
    return this.observers.state;
  }
  /**
   * Calls `listener` with every state, in order, even when another subscriber
   * changes state meanwhile. Returns the unsubscribe function.
   */
  subscribe(listener: (state: VibePlayerControllerState) => void): () => void {
    return this.observers.subscribe(listener);
  }
  /**
   * Listens to the event stream `onEvent` receives, narrowed to one `type`
   * or every event with `"*"`. Events arrive in order; a throwing or
   * rejecting listener becomes a nonfatal `integrationerror`. Returns the
   * unsubscribe function.
   */
  on<K extends VibePlayerEventType | "*">(
    type: K,
    listener: (event: VibePlayerEventOfType<K>) => void
  ): () => void {
    return this.observers.on(type, listener);
  }

  /** Mounts media in `target`; fullscreen presents `presentationTarget`. */
  mount(target: HTMLElement, presentationTarget = target): Promise<void> {
    return this.runtime.mount(target, presentationTarget);
  }
  /** Releases media and the mount target; the source stays selected. */
  unmount(): Promise<void> {
    this.poster.reset();
    this.session.cancel();
    return this.runtime.unmount();
  }

  /** Loads `source`. Manual controllers stay eager; inline assemblies select onPlay. */
  load(
    source: VibePlayerSource,
    mode: VibePlayerLoadMode = "eager"
  ): Promise<void> {
    this.poster.reset();
    return this.session.load(source, mode);
  }
  /** Creates and attaches the playback engine of a lazily loaded source. */
  activate(): Promise<void> {
    return this.session.activate();
  }
  /** Plays, attaching a lazy source or renewing an expiring delivery first. */
  play(): Promise<void> {
    return this.poster.whenSettled(() => this.session.play());
  }
  /**
   * Renews an idle delivery once per load without loading media, e.g. when a
   * private poster grant expired. Play then uses the renewed delivery.
   */
  renewPoster(): Promise<void> {
    return this.poster.renew();
  }
  /** Pauses; state stays paused while the provider catches up. */
  pause(): Promise<void> {
    this.poster.cancelWaits();
    this.session.pause();
    return this.actions.playback("pause");
  }
  /** Releases media but keeps the source and position for a later play. */
  stop(): Promise<void> {
    this.poster.cancelWaits();
    return this.session.stop();
  }
  /** Reattaches a failed source, renewing it first when `renewSource` is set. */
  retry(): Promise<void> {
    return this.session.retry();
  }
  /** Alias of `seekTo`. */
  seek(seconds: number): Promise<void> {
    return this.seekTo(seconds);
  }
  /** Seeks to `seconds`, clamped to the duration, where `canSeek` allows. */
  seekTo(seconds: number): Promise<void> {
    this.watched?.interrupt();
    return this.actions.seekTo(seconds);
  }
  /** Delivers pending watched ranges now, e.g. before the host navigates. */
  flushWatchedRanges(reason: "flush" | "hidden" = "flush"): void {
    this.watched?.flush(reason);
  }
  /** Mutes or unmutes; the choice carries over to later sources. */
  setMuted(value: boolean): Promise<void> {
    return this.actions.setMuted(value);
  }
  /** Sets the volume (0 to 1); the choice carries over to later sources. */
  setVolume(value: number): Promise<void> {
    return this.actions.setVolume(value);
  }
  /** Sets the playback rate; the choice carries over to later sources. */
  setPlaybackRate(value: number): Promise<void> {
    return this.actions.setPlaybackRate(value);
  }
  /** Selects a quality option by id where the adapter supports it. */
  setQuality(value: string): Promise<void> {
    return this.actions.setQuality(value);
  }
  /** Enters fullscreen where the adapter supports it. */
  enterFullscreen(): Promise<void> {
    return this.actions.presentation("enterFullscreen");
  }
  /** Exits fullscreen. */
  exitFullscreen(): Promise<void> {
    return this.actions.presentation("exitFullscreen");
  }
  /** Enters picture-in-picture where the adapter supports it. */
  enterPictureInPicture(): Promise<void> {
    return this.actions.presentation("enterPictureInPicture");
  }
  /** Exits picture-in-picture. */
  exitPictureInPicture(): Promise<void> {
    return this.actions.presentation("exitPictureInPicture");
  }

  /** Releases the adapter and clears the source; the mount stays. */
  closeSource(): Promise<void> {
    this.poster.reset();
    this.session.clear();
    return this.runtime.closeSource();
  }
  /** Releases media, the source and the mount target when disposing. */
  teardown(): Promise<void> {
    this.poster.reset();
    this.session.clear();
    return this.runtime.teardown();
  }
}
