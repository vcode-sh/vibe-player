import { useState } from "react";
import { VibePlayerCompact, VibePlayerStage } from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import {
  landscapeThumbnails,
  longSource,
  showcaseAudioFocus,
  withId,
} from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const seekMeta = {
  id: "seek",
  nav: "Seeking",
  title: "Skip and double-tap seek",
};

const steps = [10, 15, 30] as const;
const skip = { skip: true };
const doubleTap = { doubleTapSeek: true };

/** One `seekStep` drives skip buttons, keys and double taps everywhere. */
export function SeekSection() {
  const [step, setStep] = useState<number>(10);
  return (
    <ShowcaseSection
      api={[
        "seekStep",
        "controls.skip",
        "gestures.doubleTapSeek",
        "labels.seekBackward",
        "labels.seekForward",
        "icons.seekBackward",
        "seekThumbnails",
      ]}
      description="One step moves every relative seek: the skip buttons (the step is drawn inside the ring), ← / → and J / L on a focused player, and double taps on the left or right third of the picture, which add up while you keep tapping. The full stage has all of it by default; compact and feed opt in."
      meta={seekMeta}
      notes={
        <>
          <p>
            Double tap is touch-only. On a desktop, open DevTools, turn on the
            device toolbar (Ctrl+Shift+M / ⌘⇧M) or touch emulation, then
            double-tap a side third. A mouse double-click on the full stage
            toggles full screen instead.
          </p>
          <p>
            Skip buttons appear from 280 px wide and only where the provider can
            seek.
          </p>
        </>
      }
    >
      <div className="sc-owners__head">
        <h3 className="sc-seek__title">Seek step</h3>
        <fieldset className="sc-segmented">
          <legend className="sc-visually-hidden">Seek step</legend>
          {steps.map((value) => (
            <button
              aria-pressed={step === value}
              key={value}
              onClick={() => setStep(value)}
              type="button"
            >
              {value} s
            </button>
          ))}
        </fieldset>
      </div>
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            controls={skip}
            gestures={doubleTap}
            loadHls={loadLightHls}
            seekStep={step}
            source={withId(longSource, "seek-glass")}
            title="Glass with skips"
            variant="feed"
          />
          <ShowcaseCaption code="controls={{ skip: true }} gestures={{ doubleTapSeek: true }}">
            Glass · skips around Play · double tap
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            controls={skip}
            gestures={doubleTap}
            loadHls={loadLightHls}
            seekStep={step}
            skin="chips"
            source={withId(longSource, "seek-chips")}
            title="Chips with skips"
            variant="feed"
          />
          <ShowcaseCaption code={'skin="chips" seekStep={step}'}>
            Chips · skips beside the corner controls
          </ShowcaseCaption>
        </figure>
      </div>
      <figure className="sc-example">
        <VibePlayerStage
          audioFocus={showcaseAudioFocus}
          load="onPlay"
          loadHls={loadLightHls}
          seekStep={step}
          source={withId(longSource, "seek-stage")}
          title="Full stage seeking"
        />
        <ShowcaseCaption code="<VibePlayerStage seekStep={step} />">
          Full stage · skips and double tap on by default
        </ShowcaseCaption>
      </figure>
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            seekStep={step}
            seekThumbnails={landscapeThumbnails}
            source={withId(landscapeSource, "seek-frames-glass")}
            title="Seek frames, glass"
            variant="feed"
          />
          <ShowcaseCaption code="seekThumbnails · no heatmap">
            Glass · hover or scrub for the frame above the time
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            seekStep={step}
            seekThumbnails={landscapeThumbnails}
            skin="chips"
            source={withId(landscapeSource, "seek-frames-chips")}
            title="Seek frames, chips"
            variant="feed"
          />
          <ShowcaseCaption code='skin="chips" seekThumbnails'>
            Chips · drag the picture or use the arrow keys
          </ShowcaseCaption>
        </figure>
      </div>
    </ShowcaseSection>
  );
}
