import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type VideoHTMLAttributes,
} from "react";
import type { VibePlayerYouTubeSource } from "../core/vibe-player-source-types";
import { useVibePlayer } from "../react/use-vibe-player";
import { useVibePlayerStageObservers } from "./use-vibe-player-stage-observers";
import { getVibePlayerFrameStyle } from "./vibe-player-frame-style";
import { defaultVibePlayerLabels } from "./vibe-player-labels";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { vibePlayerClassName } from "./vibe-player-ui-context";

export interface VibePlayerHeadlessVideoProps
  extends Omit<
    VideoHTMLAttributes<HTMLVideoElement>,
    "autoPlay" | "children" | "poster" | "preload" | "src"
  > {
  "data-voice-player"?: string | undefined;
}

/** Bare video binding for hosts that draw their own controls and overlays. */
export interface VibePlayerHeadlessProps
  extends Omit<VibePlayerStageProps, "source" | "variant" | "renewSource"> {
  renewSource?: (() => Promise<VibePlayerHeadlessProps["source"]>) | undefined;
  source: Exclude<VibePlayerStageProps["source"], VibePlayerYouTubeSource>;
  videoProps?: VibePlayerHeadlessVideoProps | undefined;
}

const emptyCaptionStatus = { error: null, loading: false, track: null };

export function VibePlayerHeadless({
  load = "onPlay",
  source,
  videoProps,
  ...props
}: VibePlayerHeadlessProps) {
  const { controller, setTarget, state } = useVibePlayer({
    ...props,
    load,
    source,
  });
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const bindVideo = useCallback(
    (element: HTMLVideoElement | null) => {
      videoElement.current = element;
      setTarget(element);
    },
    [setTarget]
  );
  const activeSource = state.currentSource ?? source;
  const labels = { ...defaultVibePlayerLabels, ...props.labels };
  const title = props.title ?? activeSource.title;
  useImperativeHandle(props.controllerRef, () => controller, [controller]);
  useVibePlayerStageObservers({
    captionStatus: emptyCaptionStatus,
    controller,
    onCaptionStatusChange: props.onCaptionStatusChange,
    onError: props.onError,
    onStateChange: props.onStateChange,
    source: activeSource,
    state,
  });
  useEffect(() => {
    if (props.autoFocus) {
      videoElement.current?.focus({ preventScroll: true });
    }
  }, [props.autoFocus]);
  return (
    <video
      {...videoProps}
      aria-label={
        videoProps?.["aria-label"] ??
        (title ? labels.videoPlayerTitle(title) : labels.videoPlayer)
      }
      className={vibePlayerClassName(
        "vibe-player-headless",
        props.classNames?.root,
        props.classNames?.media,
        props.className,
        videoProps?.className
      )}
      onPlay={(event) => {
        videoProps?.onPlay?.(event);
        if (state.snapshot.readyState === "idle") {
          controller.play().catch(() => undefined);
        }
      }}
      playsInline
      poster={activeSource.posterUrl ?? undefined}
      preload="none"
      ref={bindVideo}
      style={getVibePlayerFrameStyle({
        maxRatio: props.maxRatio,
        minRatio: props.minRatio,
        snapshot: state.snapshot,
        source: activeSource,
        style: { ...props.style, ...videoProps?.style },
      })}
      tabIndex={videoProps?.tabIndex ?? -1}
    />
  );
}
