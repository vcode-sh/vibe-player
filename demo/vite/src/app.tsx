import { useCallback, useRef, useState } from "react";
import {
  cinematicDefaultSkin,
  createLocalStorageVibePlayerResumeStore,
  type VibePlayerAnalyticsEvent,
  type VibePlayerControllerState,
} from "vibe-player";
import { AnalyticsFeed } from "./components/analytics-feed";
import { PlayerShell } from "./components/player-shell";
import { SourceRail } from "./components/source-rail";
import type { DemoAnalyticsItem } from "./demo-analytics";
import { demoSources, getDemoSource } from "./demo-sources";

const resumeStore = createLocalStorageVibePlayerResumeStore({
  keyPrefix: "vibe-player-demo:",
});

function getInitialSourceId() {
  const [firstSource] = demoSources;
  if (!firstSource) {
    throw new Error("The Vite demo needs at least one source.");
  }
  return firstSource.id;
}

export function App() {
  const eventSequence = useRef(0);
  const [activeSourceId, setActiveSourceId] = useState(getInitialSourceId);
  const [events, setEvents] = useState<DemoAnalyticsItem[]>([]);
  const [playerState, setPlayerState] =
    useState<VibePlayerControllerState | null>(null);
  const activeSource = getDemoSource(activeSourceId);
  const handleAnalyticsEvent = useCallback(
    (event: VibePlayerAnalyticsEvent) => {
      const item: DemoAnalyticsItem = {
        event,
        id: `${event.sourceId}-${event.type}-${eventSequence.current}`,
      };
      eventSequence.current += 1;
      setEvents((currentEvents) => [item, ...currentEvents].slice(0, 8));
    },
    []
  );
  const handleSelectSource = useCallback((sourceId: string) => {
    setActiveSourceId(sourceId);
    setEvents([]);
    setPlayerState(null);
  }, []);

  return (
    <main className={`vp-demo-app ${cinematicDefaultSkin.classNames.root}`}>
      <header className="vp-demo-topbar">
        <div>
          <span className="vp-demo-mark">VP</span>
          <span>vibe-player</span>
        </div>
        <a
          href="https://www.npmjs.com/package/vibe-player"
          rel="noreferrer"
          target="_blank"
        >
          Package surface
        </a>
      </header>
      <div className="vp-demo-workbench">
        <SourceRail
          activeSourceId={activeSourceId}
          onSelectSource={handleSelectSource}
          sources={demoSources}
        />
        <PlayerShell
          activeSource={activeSource}
          onAnalyticsEvent={handleAnalyticsEvent}
          onStateChange={setPlayerState}
          playerState={playerState}
          resumeStore={resumeStore}
        />
        <AnalyticsFeed
          activeSource={activeSource}
          events={events}
          playerState={playerState}
        />
      </div>
    </main>
  );
}
