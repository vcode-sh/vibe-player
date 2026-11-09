import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerCaptionStatusProps {
  error: Error | null;
  onRetry: () => void;
}

/**
 * Visible caption failure with its retry. It is not a live region: the
 * player's announcer speaks the failure, so it is heard once.
 */
export function VibePlayerCaptionStatusNotice({
  error,
  onRetry,
}: VibePlayerCaptionStatusProps) {
  const { labels } = useVibePlayerUI();
  if (!error) {
    return null;
  }
  return (
    <div className="vibe-player-stage__caption-status">
      <span>{labels.captionsUnavailable}</span>
      <button onClick={onRetry} type="button">
        {labels.retryCaptions}
      </button>
    </div>
  );
}
