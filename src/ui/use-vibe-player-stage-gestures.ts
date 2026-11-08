import type { MouseEvent } from "react";
import { getVibePlayerClickedMedia } from "./use-vibe-player-stage-click";
import type { useVibePlayerStagePlayback } from "./use-vibe-player-stage-playback";
import { useVibePlayerTapSeek } from "./use-vibe-player-tap-seek";

type StagePlayback = ReturnType<typeof useVibePlayerStagePlayback>;

const ignore = () => undefined;

/**
 * Full-stage picture gestures, following YouTube: a touch double tap on the
 * left or right third seeks by the step, a mouse double click toggles full
 * screen, and a mouse click still toggles playback. Controls never count.
 */
export function useVibePlayerStageGestures(
  playback: StagePlayback,
  doubleTapSeek: boolean
) {
  const { actions, capabilities, controller, pointerType, rootElement } =
    playback;
  const { rootEvents } = playback;
  const { snapshot } = playback.state;
  const seek = useVibePlayerTapSeek({
    duration: snapshot.duration,
    enabled:
      capabilities.canSeek &&
      capabilities.supportsDuration &&
      snapshot.duration > 0 &&
      snapshot.readyState !== "idle" &&
      snapshot.readyState !== "error",
    getTime: () => controller.getState().snapshot.currentTime,
    requested: doubleTapSeek,
    seekTo: actions.seekTo,
    step: playback.seekStep,
  });
  const events = {
    ...rootEvents,
    onClick: (event: MouseEvent<HTMLElement>) => {
      const media = getVibePlayerClickedMedia(event, rootElement);
      // A touch tap's own meaning (revealing the chrome) ran on pointerdown.
      if (pointerType.current === "touch" && media && !event.defaultPrevented) {
        seek.tap(event, media, ignore);
      } else {
        rootEvents.onClick(event);
      }
    },
    onDoubleClick: (event: MouseEvent<HTMLElement>) => {
      if (
        pointerType.current !== "touch" &&
        capabilities.canFullscreen &&
        getVibePlayerClickedMedia(event, rootElement)
      ) {
        actions.toggleFullscreen();
      }
    },
  };
  return { events, indicator: seek.indicator };
}
