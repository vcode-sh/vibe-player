/**
 * The player's one polite live region. It stays mounted, so the first status
 * change is announced too, and it is visually hidden.
 */
export function VibePlayerAnnouncer({ message }: { message: string }) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="vibe-player-visually-hidden"
      data-part="announcer"
      role="status"
    >
      {message}
    </div>
  );
}
