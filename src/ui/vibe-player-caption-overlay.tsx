import { useVibePlayerUI, vibePlayerClassName } from "./vibe-player-ui-context";
export interface VibePlayerCaptionOverlayProps {
  className?: string;
  lines: string[];
}

export function VibePlayerCaptionOverlay({
  className,
  lines,
}: VibePlayerCaptionOverlayProps) {
  const { classNames } = useVibePlayerUI();
  if (lines.length === 0) {
    return null;
  }

  const rootClassName = vibePlayerClassName(
    "vibe-player-caption-overlay",
    classNames.captions,
    className
  );

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
