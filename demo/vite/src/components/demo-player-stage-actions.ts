import type {
  VibePlayerController,
  VibePlayerShortcutAction,
} from "@vibe-code/vibe-player";
import { type Dispatch, type SetStateAction, useCallback } from "react";

interface UseDemoPlayerStageActionsInput {
  controller: VibePlayerController;
  currentTime: number;
  muted: boolean;
  paused: boolean;
  setCaptionsEnabled: Dispatch<SetStateAction<boolean>>;
}

export interface DemoPlayerStageActions {
  handleShortcut: (action: VibePlayerShortcutAction) => void;
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

export function useDemoPlayerStageActions({
  controller,
  currentTime,
  muted,
  paused,
  setCaptionsEnabled,
}: UseDemoPlayerStageActionsInput): DemoPlayerStageActions {
  const seekRelative = useCallback(
    (seconds: number) => {
      controller.seekTo(currentTime + seconds).catch(() => undefined);
    },
    [controller, currentTime]
  );

  const togglePlay = useCallback(() => {
    const command = paused ? controller.play() : controller.pause();
    command.catch(() => undefined);
  }, [controller, paused]);

  const toggleMute = useCallback(() => {
    controller.setMuted(!muted).catch(() => undefined);
  }, [controller, muted]);

  const setMuted = useCallback(
    (nextMuted: boolean) => {
      controller.setMuted(nextMuted).catch(() => undefined);
    },
    [controller]
  );

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
      toggleCaptions();
    },
    [seekRelative, toggleCaptions, toggleFullscreen, toggleMute, togglePlay]
  );

  return {
    handleShortcut,
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
