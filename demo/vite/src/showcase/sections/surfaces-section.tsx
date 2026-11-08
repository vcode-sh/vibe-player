import { VibePlayerCompact } from "vibe-player";
import {
  landscapeSource,
  loadLightHls,
  portraitSource,
} from "../../adoption-sources";
import { showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const surfacesMeta = {
  id: "surfaces",
  nav: "Surfaces",
  title: "Compact and feed, in two skins",
};

/** The four compact combinations side by side, each waiting for Play. */
export function SurfacesSection() {
  return (
    <ShowcaseSection
      api={[
        "VibePlayerCompact",
        'variant="compact" | "feed"',
        'skin="glass" | "chips"',
        'load="onPlay"',
        "audioFocus",
      ]}
      description="One surface, two looks. Glass Capsule is the default; Ink Chips loads its chunk on first use and needs vibe-player/chips.css. Nothing downloads until Play, and every player on this page shares one audio focus group, so starting one pauses the other."
      meta={surfacesMeta}
    >
      <div className="sc-grid sc-grid--chat">
        <figure className="sc-example">
          <div className="sc-chat">
            <p className="sc-chat__name">Alex</p>
            <p>A little glimpse of the venue.</p>
            <VibePlayerCompact
              audioFocus={showcaseAudioFocus}
              loadHls={loadLightHls}
              source={withId(portraitSource, "surfaces-chat-glass")}
              title="Portrait chat attachment, glass"
            />
          </div>
          <ShowcaseCaption code='variant="compact"'>
            Chat bubble · Glass
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <div className="sc-chat">
            <p className="sc-chat__name">Sam</p>
            <p>Same clip, the other skin.</p>
            <VibePlayerCompact
              audioFocus={showcaseAudioFocus}
              loadHls={loadLightHls}
              skin="chips"
              source={withId(portraitSource, "surfaces-chat-chips")}
              title="Portrait chat attachment, chips"
            />
          </div>
          <ShowcaseCaption code='skin="chips"'>
            Chat bubble · Chips
          </ShowcaseCaption>
        </figure>
      </div>
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            source={withId(landscapeSource, "surfaces-feed-glass")}
            title="Feed card, glass"
            variant="feed"
          />
          <ShowcaseCaption code='variant="feed"'>Feed · Glass</ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            skin="chips"
            source={withId(landscapeSource, "surfaces-feed-chips")}
            title="Feed card, chips"
            variant="feed"
          />
          <ShowcaseCaption code='variant="feed" skin="chips"'>
            Feed · Chips
          </ShowcaseCaption>
        </figure>
      </div>
    </ShowcaseSection>
  );
}
