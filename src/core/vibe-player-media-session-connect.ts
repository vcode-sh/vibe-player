import {
  getVibePlayerAudioFocusOwner,
  subscribeVibePlayerAudioFocus,
  type VibePlayerAudioFocusParticipant,
} from "./vibe-player-audio-focus";
import type { VibePlayerController } from "./vibe-player-controller";
import { onVibePlayerControllerRetire } from "./vibe-player-controller-retirement";
import { createVibePlayerMediaSession } from "./vibe-player-media-session";
import type { UseVibePlayerMediaSessionOptions } from "./vibe-player-media-session-types";

/** Ownership decided from player state, used by the React binding. */
export interface VibePlayerMediaSessionConnection {
  disconnect(): void;
  update(options: VibePlayerMediaSessionSetting): void;
}

/** The React option: `true` (or an empty object) uses source metadata. */
export type VibePlayerMediaSessionSetting =
  | boolean
  | UseVibePlayerMediaSessionOptions
  | undefined;

type Decision = "claim" | "keep" | "release";

/** The focus owner when the player joins a group; `undefined` when not. */
type FocusOwner = VibePlayerAudioFocusParticipant | null | undefined;

const noOptions: UseVibePlayerMediaSessionOptions = {};
const inert: VibePlayerMediaSessionConnection = {
  disconnect: () => undefined,
  update: () => undefined,
};

function normalize(
  setting: VibePlayerMediaSessionSetting
): UseVibePlayerMediaSessionOptions {
  return typeof setting === "object" ? setting : noOptions;
}

/** A player in a focus group claims when it owns focus and yields to media without a session. */
function decideFromFocus(
  controller: VibePlayerController,
  owner: VibePlayerAudioFocusParticipant | null
): Decision {
  if (owner?.controller === controller) {
    return "claim";
  }
  return owner?.mediaSession === false ? "release" : "keep";
}

function decide(
  controller: VibePlayerController,
  active: boolean | undefined,
  owner: FocusOwner
): Decision {
  const { currentSource, snapshot } = controller.getState();
  const { muted, paused, readyState, volume } = snapshot;
  const inactive =
    !currentSource || readyState === "idle" || readyState === "error";
  if (inactive || active === false) {
    return "release";
  }
  if (active === true) {
    return "claim";
  }
  if (owner !== undefined) {
    return decideFromFocus(controller, owner);
  }
  const audible =
    !(paused || muted) &&
    volume > 0 &&
    (readyState === "playing" ||
      readyState === "buffering" ||
      readyState === "ready");
  return audible ? "claim" : "keep";
}

/**
 * Claims when the player becomes audible (or the host marks it `active`) and
 * releases when it stops, closes, fails or the host clears `active`. A
 * player in an audio focus group (`focusGroup`) claims when it takes focus
 * instead and releases when media without a Media Session takes it. Acting
 * only on changes lets another player keep a session it took over. Retiring
 * the controller disconnects for good.
 */
function getFocusOwner(focusGroup: string | false) {
  return focusGroup === false
    ? undefined
    : getVibePlayerAudioFocusOwner(focusGroup);
}

/** Claims or releases the session only when the decision changes. */
function createSessionEvaluator(
  getDecision: () => Decision | null,
  session: Pick<
    ReturnType<typeof createVibePlayerMediaSession>,
    "claim" | "release"
  >
): () => void {
  let last: Decision = "keep";
  return () => {
    const next = getDecision();
    if (next === null || next === last) {
      return;
    }
    last = next;
    if (next === "claim") {
      session.claim();
    } else if (next === "release") {
      session.release();
    }
  };
}

export function connectVibePlayerMediaSession(
  controller: VibePlayerController,
  setting: VibePlayerMediaSessionSetting,
  focusGroup: string | false = false
): VibePlayerMediaSessionConnection {
  if (controller.retired) {
    return inert;
  }
  let options = normalize(setting);
  let connected = true;
  const session = createVibePlayerMediaSession(controller, options);
  const evaluate = createSessionEvaluator(
    () =>
      connected
        ? decide(controller, options.active, getFocusOwner(focusGroup))
        : null,
    session
  );
  const unsubscribe = controller.subscribe(evaluate);
  const unfocus =
    focusGroup === false
      ? () => undefined
      : subscribeVibePlayerAudioFocus(evaluate, focusGroup);
  const disconnect = () => {
    connected = false;
    unsubscribe();
    unfocus();
    stopWatching();
    session.release();
  };
  const stopWatching = onVibePlayerControllerRetire(controller, disconnect);
  evaluate();
  return {
    disconnect,
    update(next) {
      if (!connected) {
        return;
      }
      options = normalize(next);
      session.setOptions(options);
      evaluate();
    },
  };
}
