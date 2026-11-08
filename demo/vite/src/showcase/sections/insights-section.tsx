import { useCallback, useState } from "react";
import {
  createLocalStorageVibePlayerResumeStore,
  formatVibePlayerTime,
  type VibePlayerAnalyticsEvent,
  VibePlayerCompact,
} from "vibe-player";
import { loadLightHls } from "../../adoption-sources";
import { LiveLog, useLiveLog } from "../live-log";
import { longSource, showcaseAudioFocus, withId } from "../showcase-media";
import { ShowcaseCaption, ShowcaseSection } from "../showcase-section";

export const insightsMeta = {
  id: "insights",
  nav: "Analytics",
  title: "Analytics events and resume",
};

const source = withId(longSource, "insights-long");
const resumeStore = createLocalStorageVibePlayerResumeStore({
  keyPrefix: "vibe-player-showcase:resume:",
});

function describeEvent(event: VibePlayerAnalyticsEvent): string {
  if (event.currentTime === undefined) {
    return event.sourceId;
  }
  return `at ${formatVibePlayerTime(event.currentTime)}`;
}

/** Host-owned sinks: the package normalizes, the host decides where to send. */
export function InsightsSection() {
  const log = useLiveLog(9);
  const [saved, setSaved] = useState(() => resumeStore.get(source.id));
  const { push } = log;
  const handleAnalytics = useCallback(
    (event: VibePlayerAnalyticsEvent) => push(event.type, describeEvent(event)),
    [push]
  );
  const refreshSaved = useCallback(
    () => setSaved(resumeStore.get(source.id)),
    []
  );
  const forget = () => {
    resumeStore.clear(source.id);
    refreshSaved();
  };
  return (
    <ShowcaseSection
      api={[
        "onAnalyticsEvent",
        "resumeStore",
        "createLocalStorageVibePlayerResumeStore",
      ]}
      description="Analytics arrive once per milestone: opened, started, seek, progress_25/50/75, completed, closed and error. The resume store remembers the position per source ID; this page uses localStorage; a store is just get, set and clear."
      meta={insightsMeta}
      notes={
        <p>
          Play past a few seconds, reload the page and press Play: playback
          continues from the saved position. Reaching the end clears it.
        </p>
      }
    >
      <div className="sc-split">
        <figure className="sc-example">
          <VibePlayerCompact
            audioFocus={showcaseAudioFocus}
            loadHls={loadLightHls}
            onAnalyticsEvent={handleAnalytics}
            onStateChange={refreshSaved}
            resumeStore={resumeStore}
            source={source}
            title="Analytics and resume"
            variant="feed"
          />
          <ShowcaseCaption code="resumeStore={createLocalStorageVibePlayerResumeStore()}">
            60 s clip · resumes after a reload
          </ShowcaseCaption>
        </figure>
        <div className="sc-stack">
          <div className="sc-log">
            <div className="sc-log__head">
              <h3>Resume store</h3>
              <div className="sc-log__actions">
                <button
                  className="sc-button sc-button--small"
                  disabled={saved === null}
                  onClick={forget}
                  type="button"
                >
                  Forget
                </button>
              </div>
            </div>
            <p className="sc-big-number">
              {saved === null ? "Nothing saved" : formatVibePlayerTime(saved)}
            </p>
          </div>
          <LiveLog
            empty="Press Play to see normalized analytics events."
            entries={log.entries}
            title="Analytics events"
          />
        </div>
      </div>
    </ShowcaseSection>
  );
}
