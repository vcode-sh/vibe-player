import { useEffect, useRef } from "react";
import type { VibePlayerController } from "../core/vibe-player-controller";
import type { VibePlayerMediaSessionConnection } from "../core/vibe-player-media-session-connect";
import type { UseVibePlayerMediaSessionOptions } from "../core/vibe-player-media-session-types";

export type { UseVibePlayerMediaSessionOptions } from "../core/vibe-player-media-session-types";

/** Loads the session integration only for players that opt in. */
export function useVibePlayerMediaSession(
  controller: VibePlayerController,
  options: boolean | UseVibePlayerMediaSessionOptions | undefined
): void {
  const enabled = Boolean(options);
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
            latest.current
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
  }, [controller, enabled]);
  useEffect(() => {
    latest.current = options;
    connection.current?.update(options);
  });
}
