interface VibePlayerCaptionStatusProps {
  error: Error | null;
  onRetry: () => void;
}

export function VibePlayerCaptionStatusNotice({
  error,
  onRetry,
}: VibePlayerCaptionStatusProps) {
  if (!error) {
    return null;
  }
  return (
    <div className="vibe-player-stage__caption-status" role="status">
      <span>Captions unavailable</span>
      <button onClick={onRetry} type="button">
        Retry captions
      </button>
    </div>
  );
}
