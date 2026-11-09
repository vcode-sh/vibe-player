import { useMemo } from "react";
import { useVibePlayerCaptions } from "../react/use-vibe-player-captions";
import { useVibePlayerStatusAnnouncement } from "./use-vibe-player-announcer";
import { useVibePlayerStageObservers } from "./use-vibe-player-stage-observers";
import type { useVibePlayerStagePlayback } from "./use-vibe-player-stage-playback";
import { useVibePlayerStageStatusView } from "./vibe-player-stage-status";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { useVibePlayerUI } from "./vibe-player-ui-context";

export type VibePlayerStagePlayback = ReturnType<
  typeof useVibePlayerStagePlayback
>;

/**
 * Full-stage captions, host observers and the status, computed once: the
 * visible status and the announcer read the same view and timer. Playback
 * status and caption failure are announced through the same region.
 */
export function useVibePlayerFullStageBindings(
  props: VibePlayerStageProps,
  playback: VibePlayerStagePlayback
) {
  const { labels } = useVibePlayerUI();
  const { activeSource, captionsEnabled, controller, state } = playback;
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: captionsEnabled,
    source: state.capabilities ? state.currentSource : null,
    ...(props.loadCaptionText
      ? { loadCaptionText: props.loadCaptionText }
      : {}),
  });
  const { error, loading, track } = captions;
  const captionStatus = useMemo(
    () => ({ error, loading, track }),
    [error, loading, track]
  );
  useVibePlayerStageObservers({
    captionStatus,
    controller,
    onCaptionStatusChange: props.onCaptionStatusChange,
    onError: props.onError,
    onStateChange: props.onStateChange,
    source: activeSource,
    state,
  });
  const statusView = useVibePlayerStageStatusView({
    playbackBlocked: state.playbackBlocked,
    snapshot: state.snapshot,
  });
  const { announcer } = playback;
  useVibePlayerStatusAnnouncement(announcer, statusView?.label ?? null);
  // Caption failure shares the player's one status region.
  useVibePlayerStatusAnnouncement(
    announcer,
    error ? labels.captionsUnavailable : null
  );
  return { captions, statusView };
}
