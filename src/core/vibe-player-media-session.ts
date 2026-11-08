import type { VibePlayerController } from "./vibe-player-controller";
import { createVibePlayerMediaSessionHandlers } from "./vibe-player-media-session-handlers";
import {
  clearMediaSessionPosition,
  createMediaSessionMetadataInit,
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

/**
 * Connects a controller to `navigator.mediaSession` while it owns the page
 * session. Without the API every call is a no-op. YouTube sources never claim:
 * their media plays in YouTube's own frame, which owns its own session.
 */
export function createVibePlayerMediaSession(
  controller: VibePlayerController,
  initialOptions: VibePlayerMediaSessionOptions = {}
): VibePlayerMediaSession {
  const token = Symbol("vibe-player-media-session");
  let options = initialOptions;
  let unsubscribe: (() => void) | null = null;
  let actionsKey = "";
  let metadataKey = "";
  let mark: MediaSessionPositionMark | null = null;
  const handlers = createVibePlayerMediaSessionHandlers(
    controller,
    () => options
  );

  const syncActions = (
    session: PageMediaSession,
    { capabilities }: VibePlayerControllerState
  ) => {
    const wanted = handlers.select(capabilities);
    const key = [...wanted.keys()].join();
    if (key === actionsKey) {
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
    actionsKey = key;
  };

  const syncMetadata = (
    session: PageMediaSession,
    state: VibePlayerControllerState
  ) => {
    const init = createMediaSessionMetadataInit(options, state.currentSource);
    const key = JSON.stringify(init);
    if (key === metadataKey || typeof MediaMetadata !== "function") {
      return;
    }
    page.metadata = new MediaMetadata(init);
    session.metadata = page.metadata;
    metadataKey = key;
  };

  const sync = (state: VibePlayerControllerState) => {
    const session = getPageMediaSession();
    if (!(session && page.owner === token)) {
      stop();
      return;
    }
    if (state.currentSource?.type === "youtube") {
      release();
      return;
    }
    syncMetadata(session, state);
    syncActions(session, state);
    session.playbackState = state.snapshot.paused ? "paused" : "playing";
    mark = syncMediaSessionPosition(
      session,
      state.snapshot,
      state.capabilities,
      mark,
      Date.now()
    );
  };

  const stop = () => {
    unsubscribe?.();
    unsubscribe = null;
    actionsKey = "";
    metadataKey = "";
    mark = null;
  };

  const release = () => {
    const session = getPageMediaSession();
    const positioned = mark !== null;
    stop();
    if (session && page.owner === token) {
      releasePage(session, positioned);
    }
  };

  return {
    claim() {
      const state = controller.getState();
      if (
        page.owner === token ||
        !getPageMediaSession() ||
        state.currentSource?.type === "youtube"
      ) {
        return;
      }
      stop();
      page.owner = token;
      unsubscribe = controller.subscribe(sync);
      sync(state);
    },
    release,
    setOptions(next) {
      options = next;
      if (unsubscribe) {
        sync(controller.getState());
      }
    },
  };
}
