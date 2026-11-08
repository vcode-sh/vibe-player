import { type Dispatch, type SetStateAction, useCallback } from "react";
import type {
  VibePlayerController,
  VibePlayerShortcutAction,
  VibePlayerSnapshot,
} from "../core";

export interface UseVibePlayerStageActionsInput {
  controller: VibePlayerController;
  /** Seconds a seek shortcut moves. */
  seekStep: number;
  setCaptionsEnabled: Dispatch<SetStateAction<boolean>>;
  snapshot: VibePlayerSnapshot;
}

export interface VibePlayerStageActions {
  handleShortcut: (action: VibePlayerShortcutAction) => void;
  /** Seeks relative to the playback position. */
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (qualityId: string) => void;
  setVolume: (volume: number) => void;
  toggleCaptions: () => void;
  toggleFullscreen: () => void;
  toggleMute: () => void;
  togglePictureInPicture: () => void;
  togglePlay: () => void;
}

export function useVibePlayerStageActions({
  controller,
  seekStep,
  setCaptionsEnabled,
  snapshot,
}: UseVibePlayerStageActionsInput): VibePlayerStageActions {
  const seekBy = useCallback(
    (seconds: number) => {
      controller.seekTo(snapshot.currentTime + seconds).catch(() => undefined);
    },
    [controller, snapshot.currentTime]
  );
  const togglePlay = useCallback(() => {
    const command = snapshot.paused ? controller.play() : controller.pause();
    command.catch(() => undefined);
  }, [controller, snapshot.paused]);
  const toggleMute = useCallback(() => {
    const nextMuted = !snapshot.muted;
    controller.setMuted(nextMuted).catch(() => undefined);
    if (snapshot.muted && !snapshot.paused) {
      controller.play().catch(() => undefined);
    }
  }, [controller, snapshot.muted, snapshot.paused]);
  const setMuted = useCallback(
    (muted: boolean) => {
      controller.setMuted(muted).catch(() => undefined);
      if (!(muted || snapshot.paused)) {
        controller.play().catch(() => undefined);
      }
    },
    [controller, snapshot.paused]
  );
  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((value) => !value);
  }, [setCaptionsEnabled]);
  const toggleFullscreen = useCallback(() => {
    const command = snapshot.isFullscreen
      ? controller.exitFullscreen()
      : controller.enterFullscreen();
    command.catch(() => undefined);
  }, [controller, snapshot.isFullscreen]);
  const togglePictureInPicture = useCallback(() => {
    const command = snapshot.isPictureInPicture
      ? controller.exitPictureInPicture()
      : controller.enterPictureInPicture();
    command.catch(() => undefined);
  }, [controller, snapshot.isPictureInPicture]);
  const seekTo = useCallback(
    (seconds: number) => {
      controller.seekTo(seconds).catch(() => undefined);
    },
    [controller]
  );
  const setPlaybackRate = useCallback(
    (rate: number) => {
      controller.setPlaybackRate(rate).catch(() => undefined);
    },
    [controller]
  );
  const setQuality = useCallback(
    (qualityId: string) => {
      controller.setQuality(qualityId).catch(() => undefined);
    },
    [controller]
  );
  const setVolume = useCallback(
    (volume: number) => {
      controller.setVolume(volume).catch(() => undefined);
    },
    [controller]
  );
  const handleShortcut = useCallback(
    (action: VibePlayerShortcutAction) => {
      if (action === "toggle-play") {
        togglePlay();
        return;
      }
      if (action === "toggle-mute") {
        toggleMute();
        return;
      }
      if (action === "seek-backward") {
        seekBy(-seekStep);
        return;
      }
      if (action === "seek-forward") {
        seekBy(seekStep);
        return;
      }
      if (action === "fullscreen") {
        toggleFullscreen();
        return;
      }
      if (action === "toggle-captions") {
        toggleCaptions();
      }
    },
    [seekBy, seekStep, toggleCaptions, toggleFullscreen, toggleMute, togglePlay]
  );
  return {
    handleShortcut,
    seekBy,
    seekTo,
    setMuted,
    setPlaybackRate,
    setQuality,
    setVolume,
    toggleCaptions,
    toggleFullscreen,
    toggleMute,
    togglePictureInPicture,
    togglePlay,
  };
}
