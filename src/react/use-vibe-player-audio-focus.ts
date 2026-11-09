import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createVibePlayerAudioFocusParticipant } from "../core/vibe-player-audio-focus";
import type { VibePlayerController } from "../core/vibe-player-controller";

/** Host media joins a named group by claiming focus when it becomes audible. */
export interface UseVibePlayerAudioFocusOptions {
  /** The player this media is, for manual controllers; omit for host media. */
  controller?: VibePlayerController | undefined;
  group?: string | false | undefined;
  /**
   * Pass `false` for media that does not use the page's Media Session, so
   * taking focus also releases a paused player's lock-screen controls.
   * Default `true`.
   */
  mediaSession?: boolean | undefined;
  onPause: () => void | Promise<void>;
}

/** Stable commands for voice notes or other host-owned media. */
export interface VibePlayerAudioFocusBinding {
  claim(): void;
  release(): void;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useVibePlayerAudioFocus({
  controller,
  group = "default",
  mediaSession = true,
  onPause,
}: UseVibePlayerAudioFocusOptions): VibePlayerAudioFocusBinding {
  const callbacks = useRef(onPause);
  useCommitEffect(() => {
    callbacks.current = onPause;
  });
  const participant = useMemo(
    () =>
      group === false
        ? null
        : createVibePlayerAudioFocusParticipant(
            group,
            () => callbacks.current(),
            { controller, mediaSession }
          ),
    [controller, group, mediaSession]
  );
  useEffect(() => () => participant?.release(), [participant]);
  return useMemo(
    () => ({
      claim: () => participant?.claim(),
      release: () => participant?.release(),
    }),
    [participant]
  );
}
