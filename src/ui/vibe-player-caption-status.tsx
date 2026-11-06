import { useVibePlayerUI } from "./vibe-player-ui-context";

interface VibePlayerCaptionStatusProps {
  error: Error | null;
  onRetry: () => void;
}

export function VibePlayerCaptionStatusNotice({
  error,
  onRetry,
}: VibePlayerCaptionStatusProps) {
  const { labels } = useVibePlayerUI();
  if (!error) {
    return null;
  }
  return (
    <div className="vibe-player-stage__caption-status" role="status">
      <span>{labels.captionsUnavailable}</span>
      <button onClick={onRetry} type="button">
        {labels.retryCaptions}
      </button>
    </div>
  );
}
