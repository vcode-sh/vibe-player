import { VibePlayerControllerActions } from "./vibe-player-controller-actions";
import { dispatchVibePlayerAdapterEvent } from "./vibe-player-controller-dispatch";
import { createVibePlayerControllerIntegrations } from "./vibe-player-controller-integrations";
import { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import { VibePlayerControllerRuntime } from "./vibe-player-controller-runtime";
import { VibePlayerPlaybackLifecycle } from "./vibe-player-playback";
import {
  createVibePlayerPosterRenewal,
  type VibePlayerPosterRenewal,
} from "./vibe-player-poster-renewal";
import { VibePlayerRawFeed } from "./vibe-player-raw-feed";
import type { VibePlayerResumeWriter } from "./vibe-player-resume-writer";
import { VibePlayerSourceSession } from "./vibe-player-source-session";
import type {
  VibePlayerControllerOptions,
  VibePlayerResumeStore,
} from "./vibe-player-types";
import type { VibePlayerWatchedRangesTracker } from "./vibe-player-watched-ranges";

/** The collaborators one controller owns, wired to each other. */
export interface VibePlayerControllerParts {
  actions: VibePlayerControllerActions;
  feed: VibePlayerRawFeed;
  observers: VibePlayerControllerObservers;
  /** Publishes every playback start on the raw feed. */
  playback: VibePlayerPlaybackLifecycle;
  poster: VibePlayerPosterRenewal;
  /** Saves resume positions when the host passed a store. */
  resume: VibePlayerResumeWriter | null;
  runtime: VibePlayerControllerRuntime;
  session: VibePlayerSourceSession;
  watched: VibePlayerWatchedRangesTracker | null;
}

export function createVibePlayerControllerParts(
  options: VibePlayerControllerOptions
): VibePlayerControllerParts {
  const observers = new VibePlayerControllerObservers(options);
  const feed = new VibePlayerRawFeed();
  // Callbacks reach parts created later, never during setup.
  const { resume, resumeStore, watched } =
    createVibePlayerControllerIntegrations(options, observers, feed, () =>
      isLive(parts)
    );
  const runtime = createRuntime(
    options,
    observers,
    feed,
    resumeStore,
    () => parts
  );
  const actions = createActions(observers, feed, runtime, resume);
  const session = createSession(options, observers, runtime, actions);
  const parts: VibePlayerControllerParts = {
    actions,
    feed,
    observers,
    playback: new VibePlayerPlaybackLifecycle((playback) =>
      feed.playback(playback)
    ),
    poster: createPoster(options, observers, runtime, session),
    resume,
    runtime,
    session,
    watched,
  };
  return parts;
}

/** The adapter's own flag; after release, the last state it published. */
function isLive({ observers, runtime }: VibePlayerControllerParts): boolean {
  const capabilities =
    runtime.adapter?.capabilities ?? observers.state.capabilities;
  return capabilities?.isLive === true;
}

function createRuntime(
  options: VibePlayerControllerOptions,
  observers: VibePlayerControllerObservers,
  feed: VibePlayerRawFeed,
  resumeStore: VibePlayerResumeStore | undefined,
  parts: () => VibePlayerControllerParts
): VibePlayerControllerRuntime {
  return new VibePlayerControllerRuntime({
    applyPreferences: () => parts().actions.applyPreferences(),
    clearIntent: () => parts().actions.clear(),
    event: (event) => dispatchVibePlayerAdapterEvent(parts(), event),
    feed,
    isPlayRequested: () => parts().session.playbackRequested,
    observers,
    options,
    resumeStore,
  });
}

function createActions(
  observers: VibePlayerControllerObservers,
  feed: VibePlayerRawFeed,
  runtime: VibePlayerControllerRuntime,
  resume: VibePlayerResumeWriter | null
): VibePlayerControllerActions {
  return new VibePlayerControllerActions(
    {
      acknowledgePause: (snapshot) => {
        const source = observers.state.currentSource;
        if (source) {
          feed.command("pause", snapshot, source);
        }
      },
      adapter: () => runtime.adapter,
      announceSeek: (initiator, snapshot, target) => {
        const source = observers.state.currentSource;
        if (source) {
          feed.seek({ initiator, snapshot, source, target });
        }
      },
      emitAnalytics: observers.emitAnalytics,
      emitEvent: (event) => observers.emitEvent(event),
      generation: () => runtime.operationGeneration,
      state: () => observers.state,
      sync: () => runtime.syncFromAdapter(),
      update: (next) => runtime.updateState(next),
    },
    resume
  );
}

function createSession(
  options: VibePlayerControllerOptions,
  observers: VibePlayerControllerObservers,
  runtime: VibePlayerControllerRuntime,
  actions: VibePlayerControllerActions
): VibePlayerSourceSession {
  return new VibePlayerSourceSession(
    {
      attach: (source) => runtime.attachSource(source),
      command: (command) => actions.playback(command),
      fail: (cause) => runtime.failRenewal(cause),
      getState: () => observers.state,
      hasAdapter: () => runtime.adapter !== null,
      prepare: (source) => runtime.prepareSource(source),
      renewed: (previous, source) => {
        const generation = runtime.operationGeneration;
        observers.renewed(previous, source, () =>
          runtime.isCurrentOperation(generation)
        );
      },
      renewing: (renewing) => {
        if (observers.state.renewing !== renewing) {
          observers.updateState({ renewing });
        }
      },
      restore: (snapshot) => actions.restore(snapshot),
      suspend: (loading) => runtime.suspend(loading),
    },
    options
  );
}

function createPoster(
  options: VibePlayerControllerOptions,
  observers: VibePlayerControllerObservers,
  runtime: VibePlayerControllerRuntime,
  session: VibePlayerSourceSession
): VibePlayerPosterRenewal {
  return createVibePlayerPosterRenewal({
    idleSource: () => (runtime.adapter ? null : observers.state.currentSource),
    renewSource: () => options.renewSource,
    replace: (previous, next) => {
      if (session.replaceIdle(previous, next)) {
        observers.updateState({ currentSource: next });
        observers.renewed(previous, next);
      }
    },
  });
}
