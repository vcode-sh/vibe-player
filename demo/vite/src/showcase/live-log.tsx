import { type ReactNode, useCallback, useRef, useState } from "react";

export interface LiveLogEntry {
  detail: string;
  id: number;
  tag: string;
}

interface LiveLogProps {
  actions?: ReactNode;
  empty: string;
  entries: readonly LiveLogEntry[];
  title: string;
}

/** A small panel listing what a callback delivered, newest first. */
export function LiveLog({ actions, empty, entries, title }: LiveLogProps) {
  return (
    <div className="sc-log">
      <div className="sc-log__head">
        <h3>{title}</h3>
        {actions ? <div className="sc-log__actions">{actions}</div> : null}
      </div>
      {entries.length > 0 ? (
        <ol aria-live="polite" className="sc-log__list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="sc-tag">{entry.tag}</span>
              <span className="sc-log__detail">{entry.detail}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="sc-log__empty">{empty}</p>
      )}
    </div>
  );
}

/** Newest-first entries with a bounded length and stable keys. */
export function useLiveLog(limit = 8) {
  const sequence = useRef(0);
  const [entries, setEntries] = useState<LiveLogEntry[]>([]);
  const push = useCallback(
    (tag: string, detail: string) => {
      sequence.current += 1;
      const entry = { detail, id: sequence.current, tag };
      setEntries((current) => [entry, ...current].slice(0, limit));
    },
    [limit]
  );
  const clear = useCallback(() => setEntries([]), []);
  return { clear, entries, push };
}
