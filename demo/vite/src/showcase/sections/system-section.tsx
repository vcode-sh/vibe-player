import { useEffect, useState } from "react";
import { VibePlayerCompact } from "vibe-player";
import {
  landscapeSource,
  loadLightHls,
  portraitSource,
} from "../../adoption-sources";
import { showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";
import { SessionOwners } from "./session-owners";

export const systemMeta = {
  id: "system",
  nav: "System controls",
  title: "Media Session and Picture-in-Picture",
};

const artwork = [
  {
    sizes: "1280x720",
    src: "/adoption-media/landscape/poster.jpg",
    type: "image/jpeg",
  },
];

const sessionMetadata = {
  album: "vibe-player showcase",
  artist: "Vibe Code",
  artwork,
};

/** What the page's one media session currently shows, polled lightly. */
function useSessionTitle(): string {
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      setTitle("unsupported");
      return;
    }
    const read = () => setTitle(navigator.mediaSession.metadata?.title ?? "");
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return title;
}

/** System media controls, session ownership and an opt-in PiP button. */
export function SystemSection() {
  const sessionTitle = useSessionTitle();
  return (
    <ShowcaseSection
      api={[
        "mediaSession={{ metadata }}",
        "mediaSession.active",
        "controls={{ pictureInPicture: true }}",
      ]}
      description="With mediaSession, the audible player drives lock screens, notifications and media keys: title, artist, artwork, play/pause, seek and Picture-in-Picture. PiP keeps playing when the page frame scrolls away or the tab is hidden."
      meta={systemMeta}
      notes={
        <>
          <p>
            To see it: play the first clip, then open Chrome's media control
            (the toolbar's music-note button) or your OS media controls, or
            press a hardware media key.
          </p>
          <p>Start PiP on the second clip and scroll away: it keeps playing.</p>
        </>
      }
    >
      <div className="sc-grid sc-grid--two">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            mediaSession={{ metadata: sessionMetadata, seekBackwardSeconds: 5 }}
            source={withId(landscapeSource, "system-session")}
            title="Media Session"
            variant="feed"
          />
          <ShowcaseCaption code="mediaSession={{ metadata, seekBackwardSeconds: 5 }}">
            Title, artist, album and artwork
          </ShowcaseCaption>
        </figure>
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            controls={{ pictureInPicture: true }}
            loadHls={loadLightHls}
            skin="chips"
            source={withId(portraitSource, "system-pip")}
            style={{ maxHeight: 420 }}
            title="Picture-in-Picture"
            variant="feed"
          />
          <ShowcaseCaption code="controls={{ pictureInPicture: true }}">
            PiP button where the provider supports it
          </ShowcaseCaption>
        </figure>
      </div>
      <SessionOwners sessionTitle={sessionTitle} />
    </ShowcaseSection>
  );
}
