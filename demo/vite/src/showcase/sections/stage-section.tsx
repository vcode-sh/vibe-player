import { useState } from "react";
import {
  VibePlayerInline,
  VibePlayerModal,
  VibePlayerStage,
} from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import {
  landscapeThumbnails,
  longSource,
  showcaseAudioFocus,
  showcaseCaptions,
  withId,
} from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const stageMeta = {
  id: "stage",
  nav: "Full player",
  title: "Full stage, inline and modal",
};

const stageSource = {
  ...withId(landscapeSource, "stage-full"),
  captions: [showcaseCaptions],
};

/** Full chrome: captions, quality and speed menus, seek frames. */
export function StageSection() {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <ShowcaseSection
      api={[
        "VibePlayerStage",
        "VibePlayerInline",
        "VibePlayerModal",
        "source.captions",
        "seekThumbnails",
      ]}
      description="The full assembly with package-owned captions, a quality menu for the two-lane HLS ladder, playback speed, volume, Picture-in-Picture and fullscreen. Hover the timeline for the storyboard frame. Inline uses the same chrome in a host-sized frame; the modal starts playback when it opens."
      meta={stageMeta}
      notes={
        <p>
          The quality menu appears where hls.js manages the stream. Browsers
          with only ManagedMediaSource (iOS Safari) play native HLS, which picks
          renditions itself, so the menu stays hidden there. Remote file, HLS
          and Bunny sources live in the{" "}
          <a href="?demo=workbench">provider workbench</a>.
        </p>
      }
    >
      <figure className="sc-example">
        <VibePlayerStage
          audioFocus={showcaseAudioFocus}
          load="onPlay"
          loadHls={loadLightHls}
          seekThumbnails={landscapeThumbnails}
          source={stageSource}
          title="Full stage"
        />
        <ShowcaseCaption code="<VibePlayerStage seekThumbnails source={{ captions }} />">
          Captions, quality, speed and seek frames
        </ShowcaseCaption>
      </figure>
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerInline
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            source={withId(longSource, "stage-inline")}
            title="Inline player"
          />
          <ShowcaseCaption code="<VibePlayerInline />">
            Inline · waits for Play
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example sc-example--centered">
          <button
            className="sc-button sc-button--primary"
            onClick={() => setViewerOpen(true)}
            type="button"
          >
            Open the viewer
          </button>
          <ShowcaseCaption code="<VibePlayerModal open onClose />">
            Modal · plays on open, Escape closes
          </ShowcaseCaption>
        </figure>
      </div>
      <VibePlayerModal
        audioFocus={showcaseAudioFocus}
        loadHls={loadLightHls}
        onClose={() => setViewerOpen(false)}
        open={viewerOpen}
        source={withId(landscapeSource, "stage-modal")}
        title="Full viewer"
      />
    </ShowcaseSection>
  );
}
