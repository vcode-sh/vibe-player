import {
  type VibePlayerAnalyticsEvent,
  type VibePlayerControllerState,
  type VibePlayerResumeStore,
  VibePlayerStage,
} from "vibe-player";
import type { DemoSourceItem } from "../demo-sources";
import { PlayerStateStrip } from "./player-state-strip";
import { createSourceAccentStyle } from "./source-accent-style";

interface PlayerShellProps {
  activeSource: DemoSourceItem;
  onAnalyticsEvent: (event: VibePlayerAnalyticsEvent) => void;
  onStateChange: (state: VibePlayerControllerState) => void;
  playerState: VibePlayerControllerState | null;
  resumeStore: VibePlayerResumeStore;
}

export function PlayerShell({
  activeSource,
  onAnalyticsEvent,
  onStateChange,
  playerState,
  resumeStore,
}: PlayerShellProps) {
  const { meta, source } = activeSource;
  const topActions = (
    <a
      className="vp-player-source-link"
      href={meta.sourceUrl}
      rel="noopener"
      target="_blank"
    >
      Open source
    </a>
  );

  return (
    <section
      aria-label="Vibe Player showcase"
      className="vp-player-shell"
      data-source-type={source.type}
    >
      <div className="vp-player-shell__header">
        <div>
          <p>{meta.stack}</p>
          <h1>{meta.title}</h1>
        </div>
        <span style={createSourceAccentStyle(meta.accent)}>{meta.label}</span>
      </div>
      <PlayerStateStrip activeSource={activeSource} playerState={playerState} />
      <div className="vp-player-shell__stage">
        <VibePlayerStage
          autoHideControls={false}
          autoPlay={source.type !== "youtube"}
          autoPlayMutedBootstrap
          onAnalyticsEvent={onAnalyticsEvent}
          onStateChange={onStateChange}
          resumeStore={resumeStore}
          source={source}
          title={meta.title}
          topActions={topActions}
        />
      </div>
      <p className="vp-player-shell__description">{meta.description}</p>
    </section>
  );
}
