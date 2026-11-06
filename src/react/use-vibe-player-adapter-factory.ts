import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { VibePlayerAdapterOptions } from "../adapters/create-vibe-player-adapter";
import type { VibePlayerControllerOptions } from "../core/vibe-player-types";

interface AdapterFactoryOptions extends VibePlayerAdapterOptions {
  adapterFactory?: VibePlayerControllerOptions["adapterFactory"] | undefined;
}

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function haveEqualConfig(
  left: VibePlayerAdapterOptions["hlsConfig"],
  right: VibePlayerAdapterOptions["hlsConfig"]
): boolean {
  if (left === right) {
    return true;
  }
  if (
    !(left && right) ||
    Object.keys(left).length !== Object.keys(right).length
  ) {
    return false;
  }
  return Object.keys(left).every(
    (key) =>
      Object.hasOwn(right, key) &&
      Object.is(
        left[key as keyof typeof left],
        right[key as keyof typeof right]
      )
  );
}

function useStableHlsConfig(config: VibePlayerAdapterOptions["hlsConfig"]) {
  const [current, setCurrent] = useState(config);
  if (!haveEqualConfig(current, config)) {
    setCurrent(config);
    return config;
  }
  return current;
}

export function useVibePlayerAdapterFactory({
  adapterFactory,
  hlsConfig: nextConfig,
  hlsRuntime,
  loadHls,
}: AdapterFactoryOptions): VibePlayerControllerOptions["adapterFactory"] {
  const loader = useRef(loadHls);
  const hlsConfig = useStableHlsConfig(nextConfig);
  useCommitEffect(() => {
    loader.current = loadHls;
  });
  return useMemo(
    () =>
      adapterFactory ??
      (async (source) => {
        const { createVibePlayerAdapter } = await import(
          "../adapters/create-vibe-player-adapter"
        );
        const currentLoader = loader.current;
        return createVibePlayerAdapter(source, {
          ...(hlsConfig ? { hlsConfig } : {}),
          ...(hlsRuntime ? { hlsRuntime } : {}),
          ...(currentLoader ? { loadHls: currentLoader } : {}),
        });
      }),
    [adapterFactory, hlsConfig, hlsRuntime]
  );
}
