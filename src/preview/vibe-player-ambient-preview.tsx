import { VibePlayerBackgroundPreview } from "./vibe-player-background-preview";
import type { VibePlayerAmbientPreviewProps } from "./vibe-player-preview-types";

export function VibePlayerAmbientPreview({
  activateLabel,
  children,
  className,
  onActivate,
  paused,
  preservePreviousLayer,
  source,
  title,
}: VibePlayerAmbientPreviewProps) {
  const content = (
    <>
      <VibePlayerBackgroundPreview
        paused={paused}
        preservePreviousLayer={preservePreviousLayer}
        source={source}
      />
      <div className="vibe-player-ambient-preview__wash" />
      <div className="vibe-player-ambient-preview__content">{children}</div>
    </>
  );

  if (onActivate) {
    return (
      <button
        aria-label={activateLabel ?? title ?? "Open video"}
        className={getClassName(className, true)}
        onClick={onActivate}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className={getClassName(className, false)}>{content}</div>;
}

function getClassName(
  className: string | undefined,
  interactive: boolean
): string {
  const names = ["vibe-player-ambient-preview"];
  if (interactive) {
    names.push("vibe-player-ambient-preview--interactive");
  }
  if (className) {
    names.push(className);
  }
  return names.join(" ");
}
