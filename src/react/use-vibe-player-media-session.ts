import { useEffect, useRef } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type { VibePlayerMediaSessionConnection } from "../core/vibe-player-media-session-connect";
import type { UseVibePlayerMediaSessionOptions } from "../core/vibe-player-media-session-types";
import { resolveVibePlayerSeekStep } from "../core/vibe-player-seek-step";

export type { UseVibePlayerMediaSessionOptions } from "../core/vibe-player-media-session-types";

interface MediaSessionBinding {
  /** The player's audio focus group; the session follows its owner. */
  focusGroup: string | false;
  seekStep?: number | undefined;
}

/** Loads the session integration only for players that opt in. */
export function useVibePlayerMediaSession(
  controller: VibePlayerController,
  setting: boolean | UseVibePlayerMediaSessionOptions | undefined,
  { focusGroup, seekStep }: MediaSessionBinding
): void {
  const enabled = Boolean(setting);
  const step = resolveVibePlayerSeekStep(seekStep);
  // The player's seek step is the default; explicit offsets still win.
  const custom = typeof setting === "object" ? setting : undefined;
  const options = setting && {
    ...custom,
    seekBackwardSeconds: custom?.seekBackwardSeconds ?? step,
    seekForwardSeconds: custom?.seekForwardSeconds ?? step,
  };
  const latest = useRef(options);
  const connection = useRef<VibePlayerMediaSessionConnection | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    import("../core/vibe-player-media-session-connect").then(
      ({ connectVibePlayerMediaSession }) => {
        if (!cancelled) {
          connection.current = connectVibePlayerMediaSession(
            controller,
            latest.current,
            focusGroup
          );
        }
      },
      () => undefined
    );
    return () => {
      cancelled = true;
      connection.current?.disconnect();
      connection.current = null;
    };
  }, [controller, enabled, focusGroup]);
  useEffect(() => {
    latest.current = options;
    connection.current?.update(options);
  });
}
