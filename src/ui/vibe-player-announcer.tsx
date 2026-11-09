/**
 * The player's one polite live region for status messages. It stays
 * mounted, so the first change is announced too, and it is visually hidden.
 * It is a plain `aria-live` section rather than `role="status"`: Orca 50
 * spam-filters a status bar's insertions that arrive within 100 ms of other
 * DOM changes from the page, but always presents a live section's text.
 */
export function VibePlayerAnnouncer({ message }: { message: string }) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="vibe-player-visually-hidden"
      data-part="announcer"
    >
      {message}
    </div>
  );
}
