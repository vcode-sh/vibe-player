import { useVibePlayerFullStageBindings } from "./use-vibe-player-full-stage-bindings";
import { useVibePlayerStageGestures } from "./use-vibe-player-stage-gestures";
import { useVibePlayerStagePlayback } from "./use-vibe-player-stage-playback";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { VibePlayerFullStageLayers } from "./vibe-player-full-stage-layers";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";

export function VibePlayerFullStage(props: VibePlayerStageProps) {
  const { classNames, labels } = useVibePlayerUI();
  const playback = useVibePlayerStagePlayback(props);
  const { activeSource, chrome, playerTitle, state } = playback;
  const gestures = useVibePlayerStageGestures(
    playback,
    props.gestures?.doubleTapSeek ?? true
  );
  const { captions, statusView } = useVibePlayerFullStageBindings(
    props,
    playback
  );
  return (
    <section
      aria-label={
        playerTitle ? labels.videoPlayerTitle(playerTitle) : labels.videoPlayer
      }
      className={vibePlayerClassName(
        "vibe-player-stage",
        props.className,
        classNames.root
      )}
      data-chrome-hidden={chrome.chromeHidden}
      data-fit={props.fit === "cover" ? "cover" : undefined}
      data-seek-thumbnails={props.seekThumbnails?.length ? true : undefined}
      data-state={state.snapshot.readyState}
      data-variant="full"
      {...gestures.events}
      ref={playback.setRootElement}
      style={getVibePlayerFrameStyle({
        maxRatio: props.maxRatio,
        minRatio: props.minRatio,
        snapshot: state.snapshot,
        source: activeSource,
        style: props.style,
      })}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The named player region owns focused media keyboard shortcuts.
      tabIndex={0}
    >
      <VibePlayerFullStageLayers
        captions={captions}
        indicator={gestures.indicator}
        playback={playback}
        props={props}
        statusView={statusView}
      />
    </section>
  );
}
