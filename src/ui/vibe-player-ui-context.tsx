import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  defaultVibePlayerLabels,
  defaultVibePlayerTimeFormatter,
} from "./vibe-player-labels";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import type { VibePlayerTimelinePreview } from "./vibe-player-timeline-preview";
import type {
  VibePlayerClassNames,
  VibePlayerIcons,
  VibePlayerLabels,
} from "./vibe-player-ui-types";

/** What a timeline background renders from. */
export interface VibePlayerTimelineBackgroundContext {
  /** Media duration in seconds; 0 until known. */
  duration: number;
  /** The previewed moment (pointer, scrub, keyboard seek), outside React. */
  preview: VibePlayerTimelinePreview;
  /** The player's `seekThumbnails`, for a preview drawn above the rail. */
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
}

/**
 * Content drawn with every package timeline (glass, chips and full stage),
 * e.g. `VibePlayerHeatmap` or chapter marks. It never receives pointer input,
 * so the seek hit area is unchanged.
 */
export type VibePlayerTimelineBackground = (
  context: VibePlayerTimelineBackgroundContext
) => ReactNode;

export interface VibePlayerUIOptions {
  classNames?: VibePlayerClassNames | undefined;
  formatTime?: ((seconds: number) => string) | undefined;
  icons?: VibePlayerIcons | undefined;
  labels?: Partial<VibePlayerLabels> | undefined;
  timelineBackground?: VibePlayerTimelineBackground | undefined;
}

interface VibePlayerUIProviderProps extends VibePlayerUIOptions {
  children: ReactNode;
  seekThumbnails?: readonly VibePlayerSeekThumbnail[] | undefined;
}

interface VibePlayerUIContextValue {
  classNames: VibePlayerClassNames;
  formatTime: (seconds: number) => string;
  icons: VibePlayerIcons;
  labels: Required<VibePlayerLabels>;
  seekThumbnails: readonly VibePlayerSeekThumbnail[] | undefined;
  timelineBackground: VibePlayerTimelineBackground | undefined;
}

const context = createContext<VibePlayerUIContextValue>({
  classNames: {},
  formatTime: defaultVibePlayerTimeFormatter,
  icons: {},
  labels: defaultVibePlayerLabels,
  seekThumbnails: undefined,
  timelineBackground: undefined,
});
const timelineContext =
  createContext<VibePlayerTimelineBackgroundContext | null>(null);

export function VibePlayerUIProvider({
  children,
  classNames,
  formatTime,
  icons,
  labels,
  seekThumbnails,
  timelineBackground,
}: VibePlayerUIProviderProps) {
  const value = useMemo(
    () => ({
      classNames: classNames ?? {},
      formatTime: formatTime ?? defaultVibePlayerTimeFormatter,
      icons: icons ?? {},
      labels: { ...defaultVibePlayerLabels, ...labels },
      seekThumbnails,
      timelineBackground,
    }),
    [classNames, formatTime, icons, labels, seekThumbnails, timelineBackground]
  );
  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useVibePlayerUI(): VibePlayerUIContextValue {
  return useContext(context);
}

/** The timeline a background is drawn in; null outside a timeline. */
export function useVibePlayerTimeline(): VibePlayerTimelineBackgroundContext | null {
  return useContext(timelineContext);
}

/** The layer under a timeline's fill; absent without a background. */
export function VibePlayerTimelineBackgroundLayer({
  className,
  duration,
  preview,
}: {
  className: string;
  duration: number;
  preview: VibePlayerTimelinePreview;
}) {
  const { seekThumbnails, timelineBackground } = useVibePlayerUI();
  const value = useMemo(
    () => ({ duration, preview, seekThumbnails }),
    [duration, preview, seekThumbnails]
  );
  if (!timelineBackground) {
    return null;
  }
  return (
    <span aria-hidden className={className} data-part="timeline-background">
      <timelineContext.Provider value={value}>
        {timelineBackground(value)}
      </timelineContext.Provider>
    </span>
  );
}

export function vibePlayerClassName(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
