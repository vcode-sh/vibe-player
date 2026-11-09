import type { VibePlayerControllerActions } from "./vibe-player-controller-actions";
import type { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import { createVibePlayerControllerParts } from "./vibe-player-controller-parts";
import { trackVibePlayerController } from "./vibe-player-controller-registry";
import { retireVibePlayerControllerParts } from "./vibe-player-controller-retire";
import type { VibePlayerControllerRuntime } from "./vibe-player-controller-runtime";
import type {
  VibePlayerEventOfType,
  VibePlayerEventType,
} from "./vibe-player-host-events";
import type { VibePlayerPlaybackLifecycle } from "./vibe-player-playback";
import type { VibePlayerPosterRenewal } from "./vibe-player-poster-renewal";
import type { VibePlayerResumeWriter } from "./vibe-player-resume-writer";
import type { VibePlayerSourceSession } from "./vibe-player-source-session";
import type {
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerLoadMode,
  VibePlayerSource,
} from "./vibe-player-types";
import type { VibePlayerWatchedRangesTracker } from "./vibe-player-watched-ranges";

/** Provider-neutral playback, renewable deliveries and explicit resource ownership. */
export class VibePlayerController {
  private readonly observers: VibePlayerControllerObservers;
  private readonly actions: VibePlayerControllerActions;
  private readonly session: VibePlayerSourceSession;
  private readonly runtime: VibePlayerControllerRuntime;
  private readonly playback: VibePlayerPlaybackLifecycle;
  private readonly poster: VibePlayerPosterRenewal;
  private readonly resume: VibePlayerResumeWriter | null;
  private readonly watched: VibePlayerWatchedRangesTracker | null;
  private isRetired = false;
  private retirement = Promise.resolve();

  /** Creates an idle controller; nothing loads until `load()`. */
  constructor(options: VibePlayerControllerOptions) {
    const parts = createVibePlayerControllerParts(options, (source) =>
      trackVibePlayerController(this, source)
    );
    this.observers = parts.observers;
    this.actions = parts.actions;
    this.session = parts.session;
    this.runtime = parts.runtime;
    this.playback = parts.playback;
    this.poster = parts.poster;
    this.resume = parts.resume;
    this.watched = parts.watched;
  }

  /** True once `retire()` was called; the controller is inert from then on. */
  get retired(): boolean {
    return this.isRetired;
  }
  /** The latest normalized state. */
  getState(): VibePlayerControllerState {
    return this.observers.state;
  }
  /**
   * Calls `listener` with every state, in order, even when another subscriber
   * changes state meanwhile, so a listener can receive states that are
   * already superseded; read `getState()` for the latest. A listener added
   * while states are delivered starts with the next state; one removed
   * meanwhile receives nothing more. Subscribers that keep changing state
   * are cut off and reported once. Afterwards every subscriber that does not
   * change the state when it receives it ends on the latest state; one that
   * changes it again is not called again, so it ends one state behind.
   * Returns the unsubscribe function.
   */
  subscribe(listener: (state: VibePlayerControllerState) => void): () => void {
    return this.observers.subscribe(listener);
  }
  /**
   * Listens to the event stream `onEvent` receives, narrowed to one `type`
   * or every event with `"*"`. Events arrive in order; a throwing or
   * rejecting listener becomes a nonfatal `integrationerror`. A listener
   * added while an event is delivered starts with the next event; one
   * removed meanwhile receives nothing more. Returns the unsubscribe
   * function.
   */
  on<K extends VibePlayerEventType | "*">(
    type: K,
    listener: (event: VibePlayerEventOfType<K>) => void
  ): () => void {
    return this.observers.on(type, listener);
  }

  /** Mounts media in `target`; fullscreen presents `presentationTarget`. */
  mount(target: HTMLElement, presentationTarget = target): Promise<void> {
    return this.live(() => this.runtime.mount(target, presentationTarget));
  }
  /** Releases media and the mount target; the source stays selected. */
  unmount(): Promise<void> {
    return this.live(() => {
      this.poster.reset();
      this.session.cancel();
      return this.runtime.unmount();
    });
  }

  /**
   * Loads `source` and starts a new playback, even for the same source.
   * Manual controllers stay eager; inline assemblies select onPlay.
   */
  load(
    source: VibePlayerSource,
    mode: VibePlayerLoadMode = "eager"
  ): Promise<void> {
    return this.live(() => {
      this.poster.reset();
      this.playback.load(source);
      return this.session.load(source, mode);
    });
  }
  /** Creates and attaches the playback engine of a lazily loaded source. */
  activate(): Promise<void> {
    return this.live(() => this.session.activate());
  }
  /** Plays, attaching a lazy source or renewing an expiring delivery first. */
  play(): Promise<void> {
    return this.live(() => this.poster.whenSettled(() => this.session.play()));
  }
  /**
   * Renews an idle delivery once per load without loading media, e.g. when a
   * private poster grant expired. Play then uses the renewed delivery.
   */
  renewPoster(): Promise<void> {
    return this.live(() => this.poster.renew());
  }
  /** Pauses; state stays paused while the provider catches up. */
  pause(): Promise<void> {
    return this.live(() => {
      this.poster.cancelWaits();
      this.session.pause();
      return this.actions.playback("pause");
    });
  }
  /** Releases media but keeps the source and position for a later play. */
  stop(): Promise<void> {
    return this.live(() => {
      this.poster.cancelWaits();
      return this.session.stop();
    });
  }
  /** Reattaches a failed source, renewing it first when `renewSource` is set. */
  retry(): Promise<void> {
    return this.live(() => this.session.retry());
  }
  /** Alias of `seekTo`. */
  seek(seconds: number): Promise<void> {
    return this.seekTo(seconds);
  }
  /**
   * Seeks to `seconds`, clamped to the duration, where `canSeek` allows.
   * Pending watched ranges are delivered first (reason `seek`).
   */
  seekTo(seconds: number): Promise<void> {
    return this.live(() => this.actions.seekTo(seconds));
  }
  /**
   * Delivers pending watched ranges now, e.g. before the host navigates.
   * `hidden` (the page was hidden) also saves the resume position.
   */
  flushWatchedRanges(reason: "flush" | "hidden" = "flush"): void {
    if (this.retired) {
      return;
    }
    this.watched?.flush(reason);
    if (reason === "hidden") {
      this.resume?.hidden();
    }
  }
  /** Mutes or unmutes; the choice carries over to later sources. */
  setMuted(value: boolean): Promise<void> {
    return this.live(() => this.actions.setMuted(value));
  }
  /** Sets the volume (0 to 1); the choice carries over to later sources. */
  setVolume(value: number): Promise<void> {
    return this.live(() => this.actions.setVolume(value));
  }
  /** Sets the playback rate; the choice carries over to later sources. */
  setPlaybackRate(value: number): Promise<void> {
    return this.live(() => this.actions.setPlaybackRate(value));
  }
  /** Selects a quality option by id where the adapter supports it. */
  setQuality(value: string): Promise<void> {
    return this.live(() => this.actions.setQuality(value));
  }
  /** Enters fullscreen where the adapter supports it. */
  enterFullscreen(): Promise<void> {
    return this.live(() => this.actions.presentation("enterFullscreen"));
  }
  /** Exits fullscreen. */
  exitFullscreen(): Promise<void> {
    return this.live(() => this.actions.presentation("exitFullscreen"));
  }
  /** Enters picture-in-picture where the adapter supports it. */
  enterPictureInPicture(): Promise<void> {
    return this.live(() => this.actions.presentation("enterPictureInPicture"));
  }
  /** Exits picture-in-picture. */
  exitPictureInPicture(): Promise<void> {
    return this.live(() => this.actions.presentation("exitPictureInPicture"));
  }

  /** Releases the adapter and clears the source; the mount stays. */
  closeSource(): Promise<void> {
    return this.live(() => {
      this.poster.reset();
      this.session.clear();
      return this.runtime.closeSource();
    });
  }
  /** Releases media, the source and the mount target when disposing. */
  teardown(): Promise<void> {
    return this.live(() => {
      this.poster.reset();
      this.session.clear();
      return this.runtime.teardown();
    });
  }
  /**
   * Ends this controller for good, e.g. when the viewer signs out, without
   * leaking anything into the next session. From the call on, listeners,
   * callbacks, analytics (no `closed`), watched ranges (the pending batch is
   * dropped) and resume saves stay silent; audio focus, the Media Session and
   * the controller registry are released; media and the source are released
   * as by `teardown()`; and every later command is a no-op. Idempotent:
   * later calls return the first call's promise, which never rejects.
   */
  retire(): Promise<void> {
    if (!this.isRetired) {
      this.isRetired = true;
      this.retirement = retireVibePlayerControllerParts(this, {
        observers: this.observers,
        poster: this.poster,
        runtime: this.runtime,
        session: this.session,
      });
    }
    return this.retirement;
  }

  private live(command: () => Promise<void>): Promise<void> {
    return this.isRetired ? Promise.resolve() : command();
  }
}
