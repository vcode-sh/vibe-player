import type { DemoSourceItem } from "../demo-sources";
import { createSourceAccentStyle } from "./source-accent-style";

interface SourceRailProps {
  activeSourceId: string;
  onSelectSource: (sourceId: string) => void;
  sources: DemoSourceItem[];
}

export function SourceRail({
  activeSourceId,
  onSelectSource,
  sources,
}: SourceRailProps) {
  return (
    <nav aria-label="Playback sources" className="vp-source-rail">
      <div className="vp-source-rail__intro">
        <span>Sources</span>
        <p>Switch providers without changing the player surface.</p>
      </div>
      <div className="vp-source-list">
        {sources.map((item) => (
          <button
            aria-pressed={item.id === activeSourceId}
            className="vp-source-card"
            data-active={item.id === activeSourceId}
            data-source-id={item.id}
            key={item.id}
            onClick={() => onSelectSource(item.id)}
            style={createSourceAccentStyle(item.meta.accent)}
            type="button"
          >
            <span>{item.meta.label}</span>
            <strong>{item.meta.title}</strong>
            <small>{item.meta.stack}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}
