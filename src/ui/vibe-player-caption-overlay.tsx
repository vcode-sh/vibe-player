export interface VibePlayerCaptionOverlayProps {
  className?: string;
  lines: string[];
}

export function VibePlayerCaptionOverlay({
  className,
  lines,
}: VibePlayerCaptionOverlayProps) {
  if (lines.length === 0) {
    return null;
  }

  const rootClassName = className
    ? `vibe-player-caption-overlay ${className}`
    : "vibe-player-caption-overlay";

  return (
    <div aria-live="polite" className={rootClassName}>
      <div className="vibe-player-caption-overlay__chip">
        <span className="vibe-player-caption-overlay__text">
          {lines.join("\n")}
        </span>
      </div>
    </div>
  );
}
