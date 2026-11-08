import { useState } from "react";
import { VibePlayerCompact } from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import { showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const sizingMeta = {
  id: "sizing",
  nav: "Sizing",
  title: "Chrome that scales with the frame",
};

const widths = [200, 280, 360, 420] as const;
const onePlay = { centerButton: "except-paused" } as const;

/** A small floating frame whose compact chrome follows its own width. */
export function SizingSection() {
  const [width, setWidth] = useState<number>(280);
  return (
    <ShowcaseSection
      api={[
        "--vibe-player-compact-control-size",
        "--vibe-player-compact-inset",
        "--vibe-player-compact-icon-size",
        "--vibe-player-compact-center-size",
        "--vibe-player-compact-chip-size",
        'controls.centerButton="except-paused"',
      ]}
      description="A mini player can be 200 px wide or twice that. The compact sizing variables take container units, which resolve against the player itself, so one rule scales the capsule, chips, icons, time and centre button with the frame. Paused, the glass player shows one Play: the capsule's."
      meta={sizingMeta}
      notes={
        <p>
          Hit areas never drop below 24 px. Keep them at 44 px on touch: the
          rule switches to fixed 44 px buttons under{" "}
          <code>(pointer: coarse)</code>.
        </p>
      }
    >
      <div className="sc-owners__head">
        <h3 className="sc-seek__title">Frame width</h3>
        <fieldset className="sc-segmented">
          <legend className="sc-visually-hidden">Frame width</legend>
          {widths.map((value) => (
            <button
              aria-pressed={width === value}
              key={value}
              onClick={() => setWidth(value)}
              type="button"
            >
              {value} px
            </button>
          ))}
        </fieldset>
      </div>
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <div className="sc-sizing__frame" style={{ width }}>
            <VibePlayerCompact
              audioFocus={showcaseAudioFocus}
              controls={onePlay}
              loadHls={loadLightHls}
              source={withId(landscapeSource, "sizing-glass")}
              title="Scaled glass mini player"
              variant="feed"
            />
          </div>
          <ShowcaseCaption code='controls={{ centerButton: "except-paused" }}'>
            Glass · scaled · one Play
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <div className="sc-sizing__frame" style={{ width }}>
            <VibePlayerCompact
              audioFocus={showcaseAudioFocus}
              loadHls={loadLightHls}
              skin="chips"
              source={withId(landscapeSource, "sizing-chips")}
              title="Scaled chips mini player"
              variant="feed"
            />
          </div>
          <ShowcaseCaption code="--vibe-player-compact-chip-size">
            Chips · scaled
          </ShowcaseCaption>
        </figure>
      </div>
    </ShowcaseSection>
  );
}
