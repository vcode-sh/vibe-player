import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
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

/** Request status excludes time-varying caption lines for host observers. */
export interface VibePlayerCaptionStatus {
  error: Error | null;
  loading: boolean;
  track: VibePlayerCaptionTrack | null;
}

export interface VibePlayerCaptionsState extends VibePlayerCaptionStatus {
  activeLines: string[];
  /** Reloads the selected track and cancels the previous request. */
  retry: () => void;
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

interface CaptionRequestState {
  attempt: number;
  cues: VibePlayerCaptionCue[];
  error: Error | null;
  loading: boolean;
  track: VibePlayerCaptionTrack;
}

interface CaptionRequestInput {
  attempt: number;
  loadCaptionText: VibePlayerCaptionTextLoader;
  signal: AbortSignal;
  track: VibePlayerCaptionTrack;
  update: (state: CaptionRequestState) => void;
}

async function loadCaptionRequest({
  attempt,
  loadCaptionText,
  signal,
  track,
  update,
}: CaptionRequestInput): Promise<void> {
  update({ attempt, cues: [], error: null, loading: true, track });
  try {
    const content = await loadCaptionText(track, signal);
    if (!signal.aborted) {
      update({
        attempt,
        cues: parseWebVtt(content),
        error: null,
        loading: false,
        track,
      });
    }
  } catch (cause) {
    if (!signal.aborted) {
      update({
        attempt,
        cues: [],
        error: toError(cause),
        loading: false,
        track,
      });
    }
  }
}

export function useVibePlayerCaptions({
  currentTime,
  enabled,
  loadCaptionText = defaultLoadCaptionText,
  source,
}: UseVibePlayerCaptionsOptions): VibePlayerCaptionsState {
  const track = useMemo(() => getPreferredCaptionTrack(source), [source]);
  const [request, setRequest] = useState<CaptionRequestState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);
  const loadTrackText = useEffectEvent(loadCaptionText);

  useEffect(() => {
    if (!(enabled && track)) {
      setRequest(null);
      return;
    }

    const abortController = new AbortController();
    loadCaptionRequest({
      attempt,
      loadCaptionText: loadTrackText,
      signal: abortController.signal,
      track,
      update: setRequest,
    });

    return () => abortController.abort();
  }, [attempt, enabled, track]);

  const current =
    enabled && request?.track === track && request.attempt === attempt
      ? request
      : null;
  const activeLines = useMemo(
    () =>
      current ? getActiveVibePlayerCaptionLines(current.cues, currentTime) : [],
    [current, currentTime]
  );

  return {
    activeLines,
    error: current?.error ?? null,
    loading: Boolean(enabled && track && (!current || current.loading)),
    retry,
    track,
  };
}
