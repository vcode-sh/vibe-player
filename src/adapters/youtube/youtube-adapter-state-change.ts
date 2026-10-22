import type { VibePlayerEventName } from "../../core/vibe-player-types";
import {
  type YouTubePlayerState,
  youtubePlayerStates,
} from "./youtube-iframe-types";

interface YouTubeStateChangeIntent {
  cancel: () => void;
  completeIfAdvanced: (currentTime: number) => void;
}

export interface HandleYouTubeAdapterStateChangeInput {
  emit: (type: VibePlayerEventName) => void;
  getCurrentTime: () => number;
  playbackIntent: YouTubeStateChangeIntent;
  playerState: YouTubePlayerState;
  setPlayerState: (state: YouTubePlayerState) => void;
  startTimeUpdates: () => void;
  stopTimeUpdates: () => void;
}

export function handleYouTubeAdapterStateChange({
  emit,
  getCurrentTime,
  playerState,
  setPlayerState,
  startTimeUpdates,
  stopTimeUpdates,
  playbackIntent,
}: HandleYouTubeAdapterStateChangeInput): void {
  setPlayerState(playerState);
  playbackIntent.completeIfAdvanced(getCurrentTime());
  if (playerState === youtubePlayerStates.playing) {
    playbackIntent.cancel();
    startTimeUpdates();
    emit("play");
    return;
  }
  stopTimeUpdates();
  if (playerState === youtubePlayerStates.buffering) {
    emit("buffering");
    return;
  }
  if (playerState === youtubePlayerStates.paused) {
    emit("pause");
    return;
  }
  if (playerState === youtubePlayerStates.ended) {
    playbackIntent.cancel();
    emit("ended");
  }
}
