import { useState } from "react";
import { VibePlayerCompact, VibePlayerModal } from "vibe-player";
import {
  landscapeSource,
  loadLightHls,
  portraitSource,
} from "./adoption-sources";
import { AdoptionCustomPlayer } from "./components/adoption-custom-player";

/** Product-sized examples share one audio group and load only on Play. */
export function AdoptionDemo() {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <main className="vp-adoption">
      <header className="vp-adoption__header">
        <div>
          <a href="?">vibe-player</a>
          <p>Small surfaces. Complete playback.</p>
        </div>
        <a href="?">Provider workbench</a>
      </header>
      <h1>One engine, room to fit.</h1>
      <p className="vp-adoption__intro">
        Chat, feed, and a focused viewer use the same source and controller.
        Each waits for Play. Generated local fMP4 clips keep this demo
        independent of external video services.
      </p>
      <div className="vp-adoption__grid">
        <section aria-labelledby="chat-heading" className="vp-adoption__panel">
          <h2 id="chat-heading">In a conversation</h2>
          <p className="vp-adoption__caption">
            Compact · 236 px · portrait · Glass Capsule
          </p>
          <div className="vp-adoption-chat">
            <p className="vp-adoption-chat__name">Alex</p>
            <p>A little glimpse of the venue.</p>
            <VibePlayerCompact
              audioFocus="adoption-demo"
              loadHls={loadLightHls}
              source={portraitSource}
              title="Portrait chat attachment"
            />
            <span className="vp-adoption-chat__time">Just now</span>
          </div>
        </section>
        <section aria-labelledby="feed-heading" className="vp-adoption__panel">
          <h2 id="feed-heading">In the feed</h2>
          <p className="vp-adoption__caption">Feed · landscape · Ink Chips</p>
          <article className="vp-adoption-feed">
            <header>
              <strong>Community journal</strong>
              <span>A moment from the gathering</span>
            </header>
            <VibePlayerCompact
              audioFocus="adoption-demo"
              loadHls={loadLightHls}
              skin="chips"
              source={landscapeSource}
              variant="feed"
            />
            <footer>
              <p>A clear view, at every size.</p>
              <button
                className="vp-adoption-action"
                onClick={() => setViewerOpen(true)}
                type="button"
              >
                Open viewer
              </button>
            </footer>
          </article>
        </section>
      </div>
      <section
        aria-labelledby="headless-heading"
        className="vp-adoption__panel"
      >
        <h2 id="headless-heading">Your own controls</h2>
        <p className="vp-adoption__caption">
          Headless · a bare video with host-rendered controls
        </p>
        <AdoptionCustomPlayer />
      </section>
      <VibePlayerModal
        audioFocus="adoption-demo"
        load="onPlay"
        loadHls={loadLightHls}
        onClose={() => setViewerOpen(false)}
        open={viewerOpen}
        source={{ ...landscapeSource, id: "adoption-viewer" }}
        title="Full viewer"
      />
    </main>
  );
}
