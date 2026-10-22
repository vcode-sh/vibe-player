import type { VibePlayerEventName } from "../../core/vibe-player-types";
import {
  type YouTubePlayerState,
  youtubePlayerStates,
} from "./youtube-iframe-types";

interface YouTubeStateChangeWatchdog {
  cancelIfIdle: () => void;
  cancelIntent: () => void;
  completeIfAdvanced: (currentTime: number) => void;
  ensureScheduled: () => void;
}

export interface HandleYouTubeAdapterStateChangeInput {
  emit: (type: VibePlayerEventName) => void;
  getCurrentTime: () => number;
  playerState: YouTubePlayerState;
  setPlayerState: (state: YouTubePlayerState) => void;
  startTimeUpdates: () => void;
  stopTimeUpdates: () => void;
  watchdog: YouTubeStateChangeWatchdog;
}

export function handleYouTubeAdapterStateChange({
  emit,
  getCurrentTime,
  playerState,
  setPlayerState,
  startTimeUpdates,
  stopTimeUpdates,
  watchdog,
}: HandleYouTubeAdapterStateChangeInput): void {
  setPlayerState(playerState);
  watchdog.completeIfAdvanced(getCurrentTime());
  if (playerState === youtubePlayerStates.playing) {
    startTimeUpdates();
    emit("play");
    return;
  }
  stopTimeUpdates();
  if (playerState === youtubePlayerStates.buffering) {
    watchdog.ensureScheduled();
    emit("buffering");
    return;
  }
  if (playerState === youtubePlayerStates.paused) {
    watchdog.cancelIfIdle();
    emit("pause");
    return;
  }
  if (playerState === youtubePlayerStates.ended) {
    watchdog.cancelIntent();
    emit("ended");
    return;
  }
  watchdog.cancelIfIdle();
}
