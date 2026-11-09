import type { VibePlayerController } from "./vibe-player-controller";
import { createVibePlayerMediaSessionHandlers } from "./vibe-player-media-session-handlers";
import { VibePlayerMediaSessionMetadataState } from "./vibe-player-media-session-metadata";
import {
  clearMediaSessionPosition,
  getPageMediaSession,
  type MediaSessionPositionMark,
  type PageMediaSession,
  setMediaSessionAction,
  syncMediaSessionPosition,
  type VibePlayerMediaSessionAction,
} from "./vibe-player-media-session-sync";
import type {
  VibePlayerMediaSession,
  VibePlayerMediaSessionOptions,
} from "./vibe-player-media-session-types";
import type { VibePlayerControllerState } from "./vibe-player-types";

/** A page has one media session; the package tracks what its owner set. */
const page = {
  actions: new Set<VibePlayerMediaSessionAction>(),
  metadata: null as MediaMetadata | null,
  owner: null as symbol | null,
};

function releasePage(session: PageMediaSession, positioned: boolean): void {
  for (const action of page.actions) {
    setMediaSessionAction(session, action, null);
  }
  page.actions.clear();
  page.owner = null;
  // Metadata replaced by host code means the host owns the session now.
  if (session.metadata !== page.metadata) {
    page.metadata = null;
    return;
  }
  page.metadata = null;
  session.metadata = null;
  session.playbackState = "none";
  if (positioned) {
    clearMediaSessionPosition(session);
  }
}

/** One player's claim on the page session, kept in sync while it owns it. */
class VibePlayerMediaSessionClaim implements VibePlayerMediaSession {
  private readonly controller: VibePlayerController;
  private readonly token = Symbol("vibe-player-media-session");
  private readonly handlers: ReturnType<
    typeof createVibePlayerMediaSessionHandlers
  >;
  private readonly metadata = new VibePlayerMediaSessionMetadataState();
  private options: VibePlayerMediaSessionOptions;
  private unsubscribe: (() => void) | null = null;
  private actionsKey = "";
  private mark: MediaSessionPositionMark | null = null;

  constructor(
    controller: VibePlayerController,
    options: VibePlayerMediaSessionOptions
  ) {
    this.controller = controller;
    this.options = options;
    this.handlers = createVibePlayerMediaSessionHandlers(
      controller,
      () => this.options
    );
  }

  claim(): void {
    const state = this.controller.getState();
    if (page.owner === this.token || !getPageMediaSession()) {
      return;
    }
    this.stop();
    page.owner = this.token;
    this.unsubscribe = this.controller.subscribe((next) => this.sync(next));
    this.sync(state);
  }

  release(): void {
    const session = getPageMediaSession();
    const positioned = this.mark !== null;
    this.stop();
    if (session && page.owner === this.token) {
      releasePage(session, positioned);
    }
  }

  setOptions(next: VibePlayerMediaSessionOptions): void {
    this.options = next;
    if (this.unsubscribe) {
      this.sync(this.controller.getState());
    }
  }

  private sync(state: VibePlayerControllerState): void {
    const session = getPageMediaSession();
    if (!(session && page.owner === this.token)) {
      this.stop();
      return;
    }
    this.syncMetadata(session, state);
    this.syncActions(session, state);
    session.playbackState = state.snapshot.paused ? "paused" : "playing";
    this.mark = syncMediaSessionPosition(
      session,
      state.snapshot,
      state.capabilities,
      this.mark,
      Date.now()
    );
  }

  private syncMetadata(
    session: PageMediaSession,
    state: VibePlayerControllerState
  ): void {
    const init = this.metadata.next(
      this.options.metadata ?? {},
      state.currentSource
    );
    if (init && typeof MediaMetadata === "function") {
      page.metadata = new MediaMetadata(init);
      session.metadata = page.metadata;
    }
  }

  private syncActions(
    session: PageMediaSession,
    { capabilities }: VibePlayerControllerState
  ): void {
    const wanted = this.handlers.select(capabilities);
    const key = [...wanted.keys()].join();
    if (key === this.actionsKey) {
      return;
    }
    for (const action of page.actions) {
      if (!wanted.has(action)) {
        setMediaSessionAction(session, action, null);
      }
    }
    for (const [action, handler] of wanted) {
      setMediaSessionAction(session, action, handler);
    }
    page.actions = new Set(wanted.keys());
    this.actionsKey = key;
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.actionsKey = "";
    this.metadata.forget();
    this.mark = null;
  }
}

/**
 * Connects a controller to `navigator.mediaSession` while it owns the page
 * session. Without the API every call is a no-op.
 */
export function createVibePlayerMediaSession(
  controller: VibePlayerController,
  options: VibePlayerMediaSessionOptions = {}
): VibePlayerMediaSession {
  return new VibePlayerMediaSessionClaim(controller, options);
}
