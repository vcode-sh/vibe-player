import { useEffect, useState } from "react";
import {
  parseVibePlayerSeekThumbnailsVtt,
  VibePlayerCompact,
  VibePlayerHeatmap,
  type VibePlayerSeekThumbnail,
} from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import {
  landscapeThumbnails,
  landscapeThumbnailTrack,
  namedPeaks,
  replayIntensity,
  replayLabels,
  showcaseAudioFocus,
  withId,
} from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const heatmapMeta = {
  id: "heatmap",
  nav: "Heatmap",
  title: "Most replayed, with the seek frame",
};

const glideBackground = () => <VibePlayerHeatmap values={replayIntensity} />;
const curveBackground = () => (
  <VibePlayerHeatmap
    peaks={namedPeaks}
    values={replayIntensity}
    variant="curve"
  />
);

/** The package fetches no thumbnail track; the host does and parses it. */
function useVttThumbnails(trackPath: string) {
  const [thumbnails, setThumbnails] = useState<
    readonly VibePlayerSeekThumbnail[] | undefined
  >(undefined);
  useEffect(() => {
    const abort = new AbortController();
    const trackUrl = new URL(trackPath, window.location.href).href;
    fetch(trackUrl, { signal: abort.signal })
      .then((response) => response.text())
      .then((text) =>
        setThumbnails(parseVibePlayerSeekThumbnailsVtt(text, trackUrl))
      )
      .catch(() => undefined);
    return () => abort.abort();
  }, [trackPath]);
  return thumbnails;
}

/** Glide and curve variants over the glass and chips timelines. */
export function HeatmapSection() {
  const vttThumbnails = useVttThumbnails(landscapeThumbnailTrack);
  return (
    <ShowcaseSection
      api={[
        "timelineBackground",
        "VibePlayerHeatmap",
        'variant="glide" | "curve"',
        "peaks",
        "labels.mostReplayed",
        "labels.replayValue",
        "createVibePlayerSeekThumbnails",
        "parseVibePlayerSeekThumbnailsVtt",
      ]}
      description="Nothing shows at rest. Hover, touch or scrub the timeline (arrow keys work on a focused player) and the replay graph appears with the storyboard frame, the time, and “Most replayed” near a peak or the host's own value elsewhere."
      meta={heatmapMeta}
      notes={
        <p>
          The values are illustrative; a real host aggregates{" "}
          <a href="#ranges">watched ranges</a>. The frames come from the
          generated 8 × 1 s storyboard, once mapped from its geometry and once
          parsed from a WebVTT thumbnail track (<code>#xywh=</code> cues).
        </p>
      }
    >
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            labels={replayLabels}
            loadHls={loadLightHls}
            seekThumbnails={landscapeThumbnails}
            source={withId(landscapeSource, "heatmap-glide")}
            timelineBackground={glideBackground}
            title="Heatmap glide"
            variant="feed"
          />
          <ShowcaseCaption code="<VibePlayerHeatmap values />">
            Glide (default) · glass · sprite geometry · detected peaks
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            labels={replayLabels}
            loadHls={loadLightHls}
            seekThumbnails={vttThumbnails}
            skin="chips"
            source={withId(landscapeSource, "heatmap-curve")}
            timelineBackground={curveBackground}
            title="Heatmap curve"
            variant="feed"
          />
          <ShowcaseCaption code='<VibePlayerHeatmap variant="curve" peaks />'>
            Curve · chips · WebVTT track · named peaks
          </ShowcaseCaption>
        </figure>
      </div>
    </ShowcaseSection>
  );
}
