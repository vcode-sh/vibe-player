import type { VibePlayerSnapshot } from "../core/vibe-player-runtime-types";
import { PauseIcon, PlayIcon, ReplayIcon } from "./vibe-player-icons";
import { useVibePlayerUI } from "./vibe-player-ui-context";

export function useVibePlayerPlaybackLabel(snapshot: VibePlayerSnapshot) {
  const { labels } = useVibePlayerUI();
  if (snapshot.readyState === "ended") {
    return labels.replay;
  }
  return snapshot.paused ? labels.play : labels.pause;
}

export function VibePlayerPlaybackIcon({
  snapshot,
}: {
  snapshot: VibePlayerSnapshot;
}) {
  if (snapshot.readyState === "ended") {
    return <ReplayIcon />;
  }
  return snapshot.paused ? <PlayIcon /> : <PauseIcon />;
}
