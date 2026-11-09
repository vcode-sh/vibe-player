import { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import type { VibePlayerControllerObservers } from "./vibe-player-controller-observers";
import type { VibePlayerRawFeed } from "./vibe-player-raw-feed";
import { VibePlayerResumeWriter } from "./vibe-player-resume-writer";
import { VibePlayerSeekAnalytics } from "./vibe-player-seek-analytics";
import type {
  VibePlayerControllerOptions,
  VibePlayerResumeStore,
} from "./vibe-player-types";
import { VibePlayerWatchedRangesTracker } from "./vibe-player-watched-ranges";

/** Host integrations that read the controller's raw adapter feed. */
export interface VibePlayerControllerIntegrations {
  analytics: VibePlayerAnalyticsSession;
  resume: VibePlayerResumeWriter | null;
  /** The host store with its failures contained; restores read it. */
  resumeStore: VibePlayerResumeStore | undefined;
  watched: VibePlayerWatchedRangesTracker | null;
}

/**
 * Subscribes in delivery order: watched ranges first, so a seek's report
 * precedes its analytics, and resume writes last, so a store that replaces
 * the source cannot hide an entry from the others.
 */
export function createVibePlayerControllerIntegrations(
  options: VibePlayerControllerOptions,
  observers: VibePlayerControllerObservers,
  feed: VibePlayerRawFeed,
  isLive: () => boolean
): VibePlayerControllerIntegrations {
  const watched = createWatchedRanges(options, observers, feed);
  const analytics = new VibePlayerAnalyticsSession({
    emit: observers.emitAnalytics,
    state: () => observers.state,
    watchedSeconds: () => watched?.watchedSeconds ?? 0,
  });
  feed.subscribe((entry) => analytics.observe(entry));
  if (options.onAnalyticsEvent) {
    const seeks = new VibePlayerSeekAnalytics(observers.emitAnalytics);
    feed.subscribe((entry) => seeks.observe(entry));
  }
  const resumeStore = observers.wrapResumeStore();
  const resume = resumeStore
    ? new VibePlayerResumeWriter(resumeStore, isLive)
    : null;
  if (resume) {
    feed.subscribe((entry) => resume.observe(entry));
  }
  return { analytics, resume, resumeStore, watched };
}

/**
 * Opt-in: the tracker reads the raw feed, never rewritten controller state.
 * Analytics milestones need its watched coverage too.
 */
function createWatchedRanges(
  options: VibePlayerControllerOptions,
  observers: VibePlayerControllerObservers,
  feed: VibePlayerRawFeed
): VibePlayerWatchedRangesTracker | null {
  if (!(options.onWatchedRanges || options.onAnalyticsEvent)) {
    return null;
  }
  const watched = new VibePlayerWatchedRangesTracker(
    observers.emitWatchedRanges
  );
  feed.subscribe((entry) => watched.observe(entry));
  return watched;
}
