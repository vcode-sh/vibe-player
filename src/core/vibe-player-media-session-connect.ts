import type { VibePlayerController } from "./vibe-player-controller";
import { createVibePlayerMediaSession } from "./vibe-player-media-session";
import type { UseVibePlayerMediaSessionOptions } from "./vibe-player-media-session-types";
import type { VibePlayerControllerState } from "./vibe-player-types";

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

const noOptions: UseVibePlayerMediaSessionOptions = {};

function normalize(
  setting: VibePlayerMediaSessionSetting
): UseVibePlayerMediaSessionOptions {
  return typeof setting === "object" ? setting : noOptions;
}

function decide(
  { currentSource, snapshot }: VibePlayerControllerState,
  active: boolean | undefined
) {
  const { muted, paused, readyState, volume } = snapshot;
  const inactive =
    !currentSource || readyState === "idle" || readyState === "error";
  const audible =
    !(paused || muted) &&
    volume > 0 &&
    (readyState === "playing" ||
      readyState === "buffering" ||
      readyState === "ready");
  if (inactive || active === false) {
    return "release";
  }
  return (active ?? audible) ? "claim" : "keep";
}

/**
 * Claims when the player becomes audible (or the host marks it `active`) and
 * releases when it stops, closes, fails or the host clears `active`. Acting
 * only on changes lets another audible player keep a session it took over.
 */
export function connectVibePlayerMediaSession(
  controller: VibePlayerController,
  setting: VibePlayerMediaSessionSetting
): VibePlayerMediaSessionConnection {
  let options = normalize(setting);
  let last = "keep";
  const session = createVibePlayerMediaSession(controller, options);
  const evaluate = (state: VibePlayerControllerState) => {
    const next = decide(state, options.active);
    if (next === last) {
      return;
    }
    last = next;
    if (next === "claim") {
      session.claim();
    } else if (next === "release") {
      session.release();
    }
  };
  const unsubscribe = controller.subscribe(evaluate);
  evaluate(controller.getState());
  return {
    disconnect() {
      unsubscribe();
      session.release();
    },
    update(next) {
      options = normalize(next);
      session.setOptions(options);
      evaluate(controller.getState());
    },
  };
}
