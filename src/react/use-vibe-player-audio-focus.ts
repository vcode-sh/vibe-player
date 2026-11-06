import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createVibePlayerAudioFocusParticipant } from "../core/vibe-player-audio-focus";

/** Host media joins a named group by claiming focus when it becomes audible. */
export interface UseVibePlayerAudioFocusOptions {
  group?: string | false | undefined;
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
  group = "default",
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
        : createVibePlayerAudioFocusParticipant(group, () =>
            callbacks.current()
          ),
    [group]
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
