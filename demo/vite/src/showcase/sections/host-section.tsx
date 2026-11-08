import { useState } from "react";
import {
  formatVibePlayerTime,
  VibePlayerCompact,
  type VibePlayerControllerState,
} from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import { showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const hostMeta = {
  id: "host",
  nav: "Floating",
  title: "Float into a mini-player without restarting",
};

const source = withId(landscapeSource, "host-feed");
const canMoveIframes =
  typeof Element !== "undefined" && "moveBefore" in Element.prototype;

interface HostStats {
  moves: number;
  playing: boolean;
  time: number;
}

/** A feed card whose playing player moves between two host elements. */
export function HostSection() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [mini, setMini] = useState<HTMLElement | null>(null);
  const [floating, setFloating] = useState(false);
  const [stats, setStats] = useState<HostStats>({
    moves: 0,
    playing: false,
    time: 0,
  });
  const toggle = () => {
    setFloating((value) => !value);
    setStats((current) => ({ ...current, moves: current.moves + 1 }));
  };
  const observe = (state: VibePlayerControllerState) =>
    setStats((current) => ({
      ...current,
      playing: !state.snapshot.paused,
      time: state.snapshot.currentTime,
    }));
  return (
    <ShowcaseSection
      api={[
        "host={element}",
        "VibePlayerHostFrame",
        "stopWhenOffscreen={false}",
      ]}
      description="Play the clip, then float it. The same media element, chrome and buffer move into the corner and back: the time keeps counting and nothing reloads. Custom UI built on useVibePlayer gets the same move with VibePlayerHostFrame."
      meta={hostMeta}
      notes={
        <p>
          File and HLS media move in every engine. A YouTube iframe survives the
          move only where <code>Element.moveBefore()</code> exists (Chromium);
          elsewhere it reloads. This browser:{" "}
          <strong>{canMoveIframes ? "has moveBefore" : "no moveBefore"}</strong>
          .
        </p>
      }
    >
      <article className="sc-card">
        <header className="sc-card__head">
          <strong>Community journal</strong>
          <span>A moment from the gathering</span>
        </header>
        <div className="sc-slot">
          <div className="sc-slot__host" ref={setSlot} />
          {floating ? (
            <p className="sc-slot__placeholder">Playing in the mini-player</p>
          ) : null}
        </div>
        <footer className="sc-card__foot">
          <dl aria-live="off" className="sc-readout">
            <div>
              <dt>Time</dt>
              <dd>{formatVibePlayerTime(stats.time)}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>{stats.playing ? "playing" : "paused"}</dd>
            </div>
            <div>
              <dt>Moves</dt>
              <dd>{stats.moves}</dd>
            </div>
          </dl>
          <button className="sc-button" onClick={toggle} type="button">
            {floating ? "Dock player" : "Float player"}
          </button>
        </footer>
      </article>
      {floating ? (
        <aside aria-label="Mini-player" className="sc-mini" ref={setMini}>
          <div className="sc-mini__bar">
            <span>Community journal</span>
            <button
              className="sc-button sc-button--small"
              onClick={toggle}
              type="button"
            >
              Dock
            </button>
          </div>
        </aside>
      ) : null}
      <VibePlayerCompact
        audioFocus={showcaseAudioFocus}
        host={floating ? mini : slot}
        loadHls={loadLightHls}
        onStateChange={observe}
        source={source}
        stopWhenOffscreen={false}
        title="Floating feed player"
        variant="feed"
      />
      <ShowcaseCaption code="<VibePlayerCompact host={floating ? mini : slot} />">
        The time readout above keeps advancing across moves
      </ShowcaseCaption>
    </ShowcaseSection>
  );
}
