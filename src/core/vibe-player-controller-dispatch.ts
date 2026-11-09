import type { VibePlayerControllerActions } from "./vibe-player-controller-actions";
import { handleVibePlayerAdapterEvent } from "./vibe-player-controller-events";
import type { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import type { VibePlayerControllerRuntime } from "./vibe-player-controller-runtime";
import type { VibePlayerRawFeed } from "./vibe-player-raw-feed";
import type { VibePlayerSourceSession } from "./vibe-player-source-session";
import type { VibePlayerAdapterEvent } from "./vibe-player-types";

export interface VibePlayerAdapterEventDispatch {
  actions: VibePlayerControllerActions;
  feed: VibePlayerRawFeed;
  observers: VibePlayerControllerObservers;
  runtime: VibePlayerControllerRuntime;
  session: VibePlayerSourceSession;
}

/**
 * Publishes the event to the raw feed exactly as reported, then lets pending
 * command intent, recovery and controller effects handle it.
 */
export function dispatchVibePlayerAdapterEvent(
  parts: VibePlayerAdapterEventDispatch,
  event: VibePlayerAdapterEvent
): void {
  const { feed, observers, runtime } = parts;
  const { adapter, operationGeneration } = runtime;
  const { currentSource } = observers.state;
  const isCurrent = () =>
    runtime.isCurrentOperation(operationGeneration) &&
    runtime.adapter === adapter &&
    observers.state.currentSource === currentSource;
  if (currentSource) {
    feed.event(event, currentSource);
  }
  // A raw feed observer may already have replaced or released this adapter.
  if (isCurrent()) {
    applyAdapterEvent(parts, event, isCurrent);
  }
}

function applyAdapterEvent(
  { actions, observers, runtime, session }: VibePlayerAdapterEventDispatch,
  event: VibePlayerAdapterEvent,
  isCurrent: () => boolean
): void {
  const { currentSource } = observers.state;
  const preservePausedIntent = actions.preservePause(event);
  if (
    (event.type === "error" && event.payload?.fatal === false) ||
    (!preservePausedIntent && session.handle(event))
  ) {
    observers.emitAdapterEvent(event, isCurrent);
    return;
  }
  handleVibePlayerAdapterEvent({
    adapter: runtime.adapter,
    analyticsSession: runtime.analyticsSession,
    currentSource,
    emitAnalytics: observers.emitAnalytics,
    event,
    isCurrent,
    playbackBlocked: observers.state.playbackBlocked,
    preservePausedIntent,
    resumeStore: runtime.resumeStore,
    updateState: (next) => runtime.updateState(next, isCurrent),
  });
  if (!isCurrent()) {
    return;
  }
  if (preservePausedIntent && currentSource) {
    observers.emitEvent({ ...event, source: currentSource });
  } else {
    observers.emitAdapterEvent(event, isCurrent);
  }
}
