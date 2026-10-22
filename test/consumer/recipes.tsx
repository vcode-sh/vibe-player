import { createElement, useState } from "react";
import {
  createHlsAdapter,
  createYouTubeAdapter,
  getNextVibePlayerPlaybackRate,
  type HlsAdapterRuntime,
  type UseVibePlayerOptions,
  useVibePlayer,
  useVibePlayerCaptions,
  type VibePlayerCaptionStatus,
  VibePlayerInline,
  VibePlayerModal,
  type VibePlayerSource,
  VibePlayerStage,
  type YouTubeAdapterRuntime,
} from "vibe-player";

export const source = {
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/en.vtt",
    },
  ],
  id: "consumer-file",
  sources: [{ mimeType: "video/mp4", url: "/movie.mp4" }],
  type: "file",
} as const satisfies VibePlayerSource;

interface ConsumerDiagnostic {
  message: string;
  sourceId: string;
}

export const diagnostics: ConsumerDiagnostic[] = [];
export const observedTimes: number[] = [];
export const captionStatuses: VibePlayerCaptionStatus[] = [];

export const options = {
  onError: (error) => {
    const message: string = error.message;
    const sourceId: string = error.sourceId;
    diagnostics.push({ message, sourceId });
  },
  source,
} satisfies UseVibePlayerOptions;

interface PresentationControlsProps {
  player: ReturnType<typeof useVibePlayer>;
}

function PresentationControls({ player }: PresentationControlsProps) {
  const { controller, state } = player;
  const { snapshot } = state;
  return (
    <>
      <button
        disabled={!state.capabilities?.canFullscreen}
        onClick={() =>
          snapshot.isFullscreen
            ? controller.exitFullscreen()
            : controller.enterFullscreen()
        }
        type="button"
      >
        {snapshot.isFullscreen ? "Exit full screen" : "Full screen"}
      </button>
      <button
        disabled={!state.capabilities?.canPictureInPicture}
        onClick={() =>
          snapshot.isPictureInPicture
            ? controller.exitPictureInPicture()
            : controller.enterPictureInPicture()
        }
        type="button"
      >
        {snapshot.isPictureInPicture
          ? "Exit picture in picture"
          : "Picture in picture"}
      </button>
      <button
        disabled={!state.capabilities?.canSetPlaybackRate}
        onClick={() =>
          controller.setPlaybackRate(
            getNextVibePlayerPlaybackRate(
              snapshot.playbackRate,
              snapshot.playbackRates
            )
          )
        }
        type="button"
      >
        Speed {snapshot.playbackRate}
      </button>
    </>
  );
}

export function CustomPlayer() {
  const [presentationTarget, setPresentationTarget] =
    useState<HTMLElement | null>(null);
  const player = useVibePlayer({ ...options, presentationTarget });
  const { controller, setTarget, state } = player;
  const captions = useVibePlayerCaptions({
    currentTime: state.snapshot.currentTime,
    enabled: true,
    source: state.currentSource,
  });
  return (
    <section ref={setPresentationTarget}>
      <div ref={setTarget} />
      <button onClick={() => controller.seekTo(11)} type="button">
        Seek
      </button>
      <button onClick={() => controller.play()} type="button">
        Play
      </button>
      <PresentationControls player={player} />
      <div aria-live="polite">{captions.activeLines.join(" ")}</div>
      {captions.error ? (
        <button onClick={captions.retry} type="button">
          Retry captions
        </button>
      ) : null}
      <output>{state.error?.phase ?? state.snapshot.readyState}</output>
    </section>
  );
}

export function runtimeOverrides(
  hls: HlsAdapterRuntime,
  youtube: YouTubeAdapterRuntime
) {
  return [createHlsAdapter(hls), createYouTubeAdapter(youtube)];
}

export const stage = createElement(VibePlayerStage, {
  ...options,
  onCaptionStatusChange: (status) => {
    captionStatuses.push(status);
  },
  onStateChange: (state) => {
    const seconds: number = state.snapshot.currentTime;
    observedTimes.push(seconds);
  },
});
export const inline = (
  <VibePlayerInline
    {...options}
    autoPlay
    topActions={<button type="button">Save</button>}
  />
);
export const modal = (
  <VibePlayerModal
    {...options}
    autoHideControls={false}
    autoPlayMutedBootstrap={false}
    open
  />
);
