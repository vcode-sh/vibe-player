import { VibePlayerControllerActions } from "./vibe-player-controller-actions";
import { handleVibePlayerAdapterEvent } from "./vibe-player-controller-events";
import { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import { VibePlayerControllerRuntime } from "./vibe-player-controller-runtime";
import {
  createVibePlayerPosterRenewal,
  type VibePlayerPosterRenewal,
} from "./vibe-player-poster-renewal";
import { VibePlayerSourceSession } from "./vibe-player-source-session";
import type {
  VibePlayerAdapterEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerLoadMode,
  VibePlayerSource,
} from "./vibe-player-types";

/** Provider-neutral playback, renewable deliveries and explicit resource ownership. */
export class VibePlayerController {
  private readonly observers: VibePlayerControllerObservers;
  private readonly actions: VibePlayerControllerActions;
  private readonly session: VibePlayerSourceSession;
  private readonly runtime: VibePlayerControllerRuntime;
  private readonly poster: VibePlayerPosterRenewal;

  constructor(options: VibePlayerControllerOptions) {
    this.observers = new VibePlayerControllerObservers(options);
    this.runtime = new VibePlayerControllerRuntime({
      applyPreferences: () => this.actions.applyPreferences(),
      clearIntent: () => this.actions.clear(),
      event: (event) => this.handleAdapterEvent(event),
      isPlayRequested: () => this.session.playbackRequested,
      observers: this.observers,
      options,
    });
    this.actions = new VibePlayerControllerActions(
      {
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

  getState(): VibePlayerControllerState {
    return this.observers.state;
  }
  subscribe(listener: (state: VibePlayerControllerState) => void): () => void {
    return this.observers.subscribe(listener);
  }

  mount(target: HTMLElement, presentationTarget = target): Promise<void> {
    return this.runtime.mount(target, presentationTarget);
  }
  unmount(): Promise<void> {
    this.poster.reset();
    this.session.cancel();
    return this.runtime.unmount();
  }

  /** Manual controllers stay eager; inline assemblies select onPlay. */
  load(
    source: VibePlayerSource,
    mode: VibePlayerLoadMode = "eager"
  ): Promise<void> {
    this.poster.reset();
    return this.session.load(source, mode);
  }
  activate(): Promise<void> {
    return this.session.activate();
  }
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
  pause(): Promise<void> {
    this.poster.cancelWaits();
    this.session.pause();
    return this.actions.playback("pause");
  }
  stop(): Promise<void> {
    this.poster.cancelWaits();
    return this.session.stop();
  }
  retry(): Promise<void> {
    return this.session.retry();
  }
  seek(seconds: number): Promise<void> {
    return this.seekTo(seconds);
  }
  seekTo(seconds: number): Promise<void> {
    return this.actions.seekTo(seconds);
  }
  setMuted(value: boolean): Promise<void> {
    return this.actions.setMuted(value);
  }
  setVolume(value: number): Promise<void> {
    return this.actions.setVolume(value);
  }
  setPlaybackRate(value: number): Promise<void> {
    return this.actions.setPlaybackRate(value);
  }
  setQuality(value: string): Promise<void> {
    return this.actions.setQuality(value);
  }
  enterFullscreen(): Promise<void> {
    return this.actions.presentation("enterFullscreen");
  }
  exitFullscreen(): Promise<void> {
    return this.actions.presentation("exitFullscreen");
  }
  enterPictureInPicture(): Promise<void> {
    return this.actions.presentation("enterPictureInPicture");
  }
  exitPictureInPicture(): Promise<void> {
    return this.actions.presentation("exitPictureInPicture");
  }

  closeSource(): Promise<void> {
    this.poster.reset();
    this.session.clear();
    return this.runtime.closeSource();
  }
  teardown(): Promise<void> {
    this.poster.reset();
    this.session.clear();
    return this.runtime.teardown();
  }

  private handleAdapterEvent(event: VibePlayerAdapterEvent): void {
    const { adapter, operationGeneration } = this.runtime;
    const { currentSource, playbackBlocked } = this.observers.state;
    const isCurrent = () =>
      this.runtime.isCurrentOperation(operationGeneration) &&
      this.runtime.adapter === adapter &&
      this.observers.state.currentSource === currentSource;
    const preservePausedIntent = this.actions.preservePause(event);
    if (
      (event.type === "error" && event.payload?.fatal === false) ||
      (!preservePausedIntent && this.session.handle(event))
    ) {
      this.observers.emitAdapterEvent(event, isCurrent);
      return;
    }
    handleVibePlayerAdapterEvent({
      adapter,
      analyticsSession: this.runtime.analyticsSession,
      currentSource,
      emitAnalytics: this.observers.emitAnalytics,
      event,
      isCurrent,
      playbackBlocked,
      preservePausedIntent,
      resumeStore: this.runtime.resumeStore,
      updateState: (next) => this.runtime.updateState(next, isCurrent),
    });
    if (isCurrent()) {
      if (preservePausedIntent && currentSource) {
        this.observers.emitEvent({ ...event, source: currentSource });
      } else {
        this.observers.emitAdapterEvent(event, isCurrent);
      }
    }
  }
}
