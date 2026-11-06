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

export interface VibePlayerUIOptions {
  classNames?: VibePlayerClassNames | undefined;
  formatTime?: ((seconds: number) => string) | undefined;
  icons?: VibePlayerIcons | undefined;
  labels?: Partial<VibePlayerLabels> | undefined;
}

interface VibePlayerUIContextValue {
  classNames: VibePlayerClassNames;
  formatTime: (seconds: number) => string;
  icons: VibePlayerIcons;
  labels: VibePlayerLabels;
}

const context = createContext<VibePlayerUIContextValue>({
  classNames: {},
  formatTime: defaultVibePlayerTimeFormatter,
  icons: {},
  labels: defaultVibePlayerLabels,
});

export function VibePlayerUIProvider({
  children,
  classNames,
  formatTime,
  icons,
  labels,
}: VibePlayerUIOptions & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      classNames: classNames ?? {},
      formatTime: formatTime ?? defaultVibePlayerTimeFormatter,
      icons: icons ?? {},
      labels: { ...defaultVibePlayerLabels, ...labels },
    }),
    [classNames, formatTime, icons, labels]
  );
  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useVibePlayerUI(): VibePlayerUIContextValue {
  return useContext(context);
}

export function vibePlayerClassName(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
