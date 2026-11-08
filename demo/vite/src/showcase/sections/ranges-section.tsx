import { useCallback, useRef, useState } from "react";
import {
  formatVibePlayerTime,
  VibePlayerCompact,
  type VibePlayerController,
  type VibePlayerWatchedRangesReport,
} from "vibe-player";
import { loadLightHls } from "../../adoption-sources";
import { LiveLog, useLiveLog } from "../live-log";
import { longSource, showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const rangesMeta = {
  id: "ranges",
  nav: "Watched ranges",
  title: "Watched ranges, reported by reason",
};

const source = withId(longSource, "ranges-long");

function describeRanges(report: VibePlayerWatchedRangesReport): string {
  return report.ranges
    .map(
      (range) =>
        `${formatVibePlayerTime(range.start)}–${formatVibePlayerTime(range.end)}`
    )
    .join(", ");
}

function sumSeconds(report: VibePlayerWatchedRangesReport): number {
  return report.ranges.reduce(
    (total, range) => total + range.end - range.start,
    0
  );
}

/** Only real playback counts: seeks, scrubs, loops and stalls never do. */
export function RangesSection() {
  const controller = useRef<VibePlayerController | null>(null);
  const log = useLiveLog(10);
  const [watched, setWatched] = useState(0);
  const { push } = log;
  const handleRanges = useCallback(
    (report: VibePlayerWatchedRangesReport) => {
      push(report.reason, describeRanges(report));
      setWatched((total) => total + sumSeconds(report));
    },
    [push]
  );
  return (
    <ShowcaseSection
      api={["onWatchedRanges", "controller.flushWatchedRanges()"]}
      description="Play, skip ahead, scrub back, pause. Each report holds the merged ranges that actually played since the last one and why it was sent: pause, ended, close, hidden (switch tabs), limit, or flush. The package sends and stores nothing; the host aggregates."
      meta={rangesMeta}
    >
      <div className="sc-split">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            controllerRef={controller}
            loadHls={loadLightHls}
            onWatchedRanges={handleRanges}
            source={source}
            title="Watched ranges"
            variant="feed"
          />
          <ShowcaseCaption code="onWatchedRanges={(report) => …}">
            60 s clip · reports arrive on the right
          </ShowcaseCaption>
        </figure>
        <LiveLog
          actions={
            <>
              <button
                className="sc-button sc-button--small"
                onClick={() => controller.current?.flushWatchedRanges()}
                type="button"
              >
                Flush now
              </button>
              <button
                className="sc-button sc-button--small"
                onClick={() => {
                  log.clear();
                  setWatched(0);
                }}
                type="button"
              >
                Clear
              </button>
            </>
          }
          empty="Play for a few seconds, then pause or press Flush now."
          entries={log.entries}
          title={`Reports · ${watched.toFixed(1)} s watched`}
        />
      </div>
    </ShowcaseSection>
  );
}
