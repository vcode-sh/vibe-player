import type { VibePlayerControllerState } from "vibe-player";
import type { DemoAnalyticsItem } from "../demo-analytics";
import type { DemoSourceItem } from "../demo-sources";
import { createSourceAccentStyle } from "./source-accent-style";

interface AnalyticsFeedProps {
  activeSource: DemoSourceItem;
  events: DemoAnalyticsItem[];
  playerState: VibePlayerControllerState | null;
}

interface StateRow {
  label: string;
  value: string;
}

interface CapabilityRow {
  active: boolean;
  label: string;
}

function formatEventTime(item: DemoAnalyticsItem) {
  const { event } = item;
  if (event.currentTime === undefined) {
    return "start";
  }
  return `${Math.round(event.currentTime)}s`;
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0.0s";
  }
  return `${seconds.toFixed(1)}s`;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) {
    return "0%";
  }
  return `${Math.round(value)}%`;
}

function getStateRows(
  playerState: VibePlayerControllerState | null
): StateRow[] {
  if (!playerState) {
    return [{ label: "Ready", value: "mounting" }];
  }
  return [
    { label: "Ready", value: playerState.snapshot.readyState },
    { label: "Event", value: playerState.lastEvent ?? "none" },
    {
      label: "Time",
      value: `${formatSeconds(playerState.snapshot.currentTime)} / ${formatSeconds(playerState.snapshot.duration)}`,
    },
    { label: "Paused", value: playerState.snapshot.paused ? "yes" : "no" },
    { label: "Muted", value: playerState.snapshot.muted ? "yes" : "no" },
    {
      label: "Volume",
      value: `${Math.round(playerState.snapshot.volume * 100)}%`,
    },
    { label: "Rate", value: `${playerState.snapshot.playbackRate}x` },
    {
      label: "Buffered",
      value: formatPercent(playerState.snapshot.bufferedPct),
    },
  ];
}

function getCapabilityRows(
  playerState: VibePlayerControllerState | null
): CapabilityRow[] {
  const capabilities = playerState?.capabilities;
  if (!capabilities) {
    return [{ active: false, label: "Waiting for adapter" }];
  }
  return [
    { active: capabilities.canSeek, label: "Seek" },
    { active: capabilities.supportsVolumeControl, label: "Volume" },
    { active: capabilities.canSetPlaybackRate, label: "Rate" },
    { active: capabilities.canShowCaptions, label: "Captions" },
    { active: capabilities.supportsQualitySelection, label: "Quality" },
    { active: capabilities.canPictureInPicture, label: "PiP" },
  ];
}

export function AnalyticsFeed({
  activeSource,
  events,
  playerState,
}: AnalyticsFeedProps) {
  const { meta, source } = activeSource;
  const stateRows = getStateRows(playerState);
  const capabilityRows = getCapabilityRows(playerState);

  return (
    <section
      aria-label="Analytics events"
      className="vp-demo-panel"
      style={createSourceAccentStyle(meta.accent)}
    >
      <div className="vp-demo-panel__section">
        <div className="vp-demo-panel__heading">
          <h2>Source proof</h2>
          <span>{source.type}</span>
        </div>
        <dl className="vp-source-proof">
          <div>
            <dt>Provider</dt>
            <dd>{meta.stack}</dd>
          </div>
          <div>
            <dt>Source ID</dt>
            <dd>{source.id}</dd>
          </div>
          <div>
            <dt>Fixture</dt>
            <dd>{meta.sourceUrl}</dd>
          </div>
        </dl>
        <ul className="vp-capability-list">
          {meta.capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </div>
      <div className="vp-demo-panel__section">
        <div className="vp-demo-panel__heading">
          <h2>Live state</h2>
          <span>{playerState?.currentSource?.id ?? "mounting"}</span>
        </div>
        <dl className="vp-state-grid">
          {stateRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="vp-capability-flags">
          {capabilityRows.map((row) => (
            <li data-active={row.active} key={row.label}>
              {row.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="vp-demo-panel__section">
        <div className="vp-demo-panel__heading">
          <h2>Analytics</h2>
          <span>{events.length} latest</span>
        </div>
        {events.length > 0 ? (
          <ol className="vp-event-list">
            {events.map((item) => (
              <li className="vp-event-list__item" key={item.id}>
                <span>{item.event.type}</span>
                <strong>{formatEventTime(item)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="vp-demo-panel__empty">
            Start playback to see normalized package events.
          </p>
        )}
      </div>
    </section>
  );
}
