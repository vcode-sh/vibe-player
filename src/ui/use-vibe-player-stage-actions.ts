import { type Dispatch, type SetStateAction, useCallback } from "react";
import type {
  VibePlayerController,
  VibePlayerShortcutAction,
  VibePlayerSnapshot,
} from "../core";

export interface UseVibePlayerStageActionsInput {
  controller: VibePlayerController;
  setCaptionsEnabled: Dispatch<SetStateAction<boolean>>;
  snapshot: VibePlayerSnapshot;
}

export interface VibePlayerStageActions {
  handleShortcut: (action: VibePlayerShortcutAction) => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (qualityId: string) => void;
  toggleCaptions: () => void;
  toggleFullscreen: () => void;
  toggleMute: () => void;
  togglePictureInPicture: () => void;
  togglePlay: () => void;
}

export function useVibePlayerStageActions({
  controller,
  setCaptionsEnabled,
  snapshot,
}: UseVibePlayerStageActionsInput): VibePlayerStageActions {
  const seekRelative = useCallback(
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
  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((value) => !value);
  }, [setCaptionsEnabled]);
  const toggleFullscreen = useCallback(() => {
    controller.enterFullscreen().catch(() => undefined);
  }, [controller]);
  const togglePictureInPicture = useCallback(() => {
    controller.enterPictureInPicture().catch(() => undefined);
  }, [controller]);
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
        seekRelative(-10);
        return;
      }
      if (action === "seek-forward") {
        seekRelative(10);
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
    [seekRelative, toggleCaptions, toggleFullscreen, toggleMute, togglePlay]
  );
  return {
    handleShortcut,
    seekTo,
    setPlaybackRate,
    setQuality,
    toggleCaptions,
    toggleFullscreen,
    toggleMute,
    togglePictureInPicture,
    togglePlay,
  };
}
