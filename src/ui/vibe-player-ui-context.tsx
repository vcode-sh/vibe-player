import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  defaultVibePlayerLabels,
  defaultVibePlayerTimeFormatter,
} from "./vibe-player-labels";
import type {
  VibePlayerClassNames,
  VibePlayerIcons,
  VibePlayerLabels,
} from "./vibe-player-ui-types";

/** What a timeline background renders from. */
export interface VibePlayerTimelineBackgroundContext {
  /** Media duration in seconds; 0 until known. */
  duration: number;
}

/**
 * Content drawn under the progress fill of every package timeline (glass,
 * chips and full stage), e.g. `VibePlayerHeatmap` or chapter marks. It never
 * receives pointer input, so the seek hit area is unchanged.
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

interface VibePlayerUIContextValue {
  classNames: VibePlayerClassNames;
  formatTime: (seconds: number) => string;
  icons: VibePlayerIcons;
  labels: VibePlayerLabels;
  timelineBackground: VibePlayerTimelineBackground | undefined;
}

const context = createContext<VibePlayerUIContextValue>({
  classNames: {},
  formatTime: defaultVibePlayerTimeFormatter,
  icons: {},
  labels: defaultVibePlayerLabels,
  timelineBackground: undefined,
});

export function VibePlayerUIProvider({
  children,
  classNames,
  formatTime,
  icons,
  labels,
  timelineBackground,
}: VibePlayerUIOptions & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      classNames: classNames ?? {},
      formatTime: formatTime ?? defaultVibePlayerTimeFormatter,
      icons: icons ?? {},
      labels: { ...defaultVibePlayerLabels, ...labels },
      timelineBackground,
    }),
    [classNames, formatTime, icons, labels, timelineBackground]
  );
  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useVibePlayerUI(): VibePlayerUIContextValue {
  return useContext(context);
}

/** The layer under a timeline's fill; absent without a background. */
export function VibePlayerTimelineBackgroundLayer({
  className,
  duration,
}: {
  className: string;
  duration: number;
}) {
  const { timelineBackground } = useVibePlayerUI();
  if (!timelineBackground) {
    return null;
  }
  return (
    <span aria-hidden className={className} data-part="timeline-background">
      {timelineBackground({ duration })}
    </span>
  );
}

export function vibePlayerClassName(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
