import { useEffect, useMemo, useState } from "react";
import {
  getActiveVibePlayerCaptionLines,
  parseWebVtt,
  type VibePlayerCaptionCue,
} from "../captions";
import type {
  VibePlayerCaptionTrack,
  VibePlayerSource,
} from "../core/vibe-player-types";

export type VibePlayerCaptionTextLoader = (
  track: VibePlayerCaptionTrack,
  signal: AbortSignal
) => Promise<string>;

export interface UseVibePlayerCaptionsOptions {
  currentTime: number;
  enabled: boolean;
  loadCaptionText?: VibePlayerCaptionTextLoader;
  source: VibePlayerSource | null;
}

export interface VibePlayerCaptionsState {
  activeLines: string[];
  error: Error | null;
  loading: boolean;
  track: VibePlayerCaptionTrack | null;
}

async function defaultLoadCaptionText(
  track: VibePlayerCaptionTrack,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(track.url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load caption track ${track.id}.`);
  }
  return response.text();
}

function getPreferredCaptionTrack(
  source: VibePlayerSource | null
): VibePlayerCaptionTrack | null {
  if (!(source && source.type !== "youtube")) {
    return null;
  }
  const tracks = source.captions ?? [];
  return tracks.find((track) => track.default) ?? tracks[0] ?? null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Failed to load captions.");
}

interface LoadedCaptions {
  cues: VibePlayerCaptionCue[];
  track: VibePlayerCaptionTrack;
}

export function useVibePlayerCaptions({
  currentTime,
  enabled,
  loadCaptionText = defaultLoadCaptionText,
  source,
}: UseVibePlayerCaptionsOptions): VibePlayerCaptionsState {
  const track = useMemo(() => getPreferredCaptionTrack(source), [source]);
  const [loadedCaptions, setLoadedCaptions] = useState<LoadedCaptions | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!(enabled && track)) {
      setLoadedCaptions(null);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoadedCaptions(null);
    setLoading(true);
    setError(null);
    loadCaptionText(track, abortController.signal)
      .then((content) => {
        if (!abortController.signal.aborted) {
          setLoadedCaptions({ cues: parseWebVtt(content), track });
        }
      })
      .catch((captionError: unknown) => {
        if (!abortController.signal.aborted) {
          setLoadedCaptions(null);
          setError(toError(captionError));
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [enabled, loadCaptionText, track]);

  const activeLines = useMemo(
    () =>
      enabled && loadedCaptions?.track === track
        ? getActiveVibePlayerCaptionLines(loadedCaptions.cues, currentTime)
        : [],
    [currentTime, enabled, loadedCaptions, track]
  );

  return { activeLines, error, loading, track };
}
