import { useEffect } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type { VibePlayerControllerState } from "../core/vibe-player-types";
import { useVibePlayerAudioFocus } from "./use-vibe-player-audio-focus";

/** A player's place in an audio focus group and what it does on losing it. */
export interface VibePlayerAudioFocusOptions {
  /** Media sharing a group takes turns being audible. Default `"default"`. */
  group?: string | undefined;
  /**
   * What the player does when another participant takes focus: `"pause"`
   * (default) keeps the media loaded; `"stop"` releases it and keeps the
   * source and position for a later play.
   */
  onLose?: "pause" | "stop" | undefined;
}

/** The `audioFocus` option: a group name, options, or `false` to opt out. */
export type VibePlayerAudioFocusSetting =
  | string
  | false
  | VibePlayerAudioFocusOptions
  | undefined;

interface UseVibePlayerAudibleFocusOptions {
  controller: VibePlayerController;
  focus: VibePlayerAudioFocusSetting;
  /** Whether this player shows system media controls. */
  mediaSession: boolean;
  state: VibePlayerControllerState;
}

/** The group a setting joins, or `false` when the host coordinates. */
export function getVibePlayerAudioFocusGroup(
  focus: VibePlayerAudioFocusSetting
): string | false {
  if (focus === false) {
    return false;
  }
  return typeof focus === "string" ? focus : (focus?.group ?? "default");
}

export function useVibePlayerAudibleFocus({
  controller,
  focus,
  mediaSession,
  state,
}: UseVibePlayerAudibleFocusOptions): void {
  const onLose = typeof focus === "object" ? focus.onLose : undefined;
  const { claim, release } = useVibePlayerAudioFocus({
    controller,
    group: getVibePlayerAudioFocusGroup(focus),
    mediaSession,
    onPause: () => (onLose === "stop" ? controller.stop() : controller.pause()),
  });
  const { muted, paused, readyState, volume } = state.snapshot;
  useEffect(() => {
    const playable =
      readyState === "playing" ||
      readyState === "buffering" ||
      readyState === "ready";
    if (!(paused || muted) && volume > 0 && playable) {
      claim();
    } else {
      release();
    }
  }, [claim, muted, paused, readyState, release, volume]);
}
