import { useCallback, useEffect, useMemo, useState } from "react";
import { VibePlayerBackgroundLayer } from "./vibe-player-background-layer";
import type {
  VibePlayerBackgroundLayerSnapshot,
  VibePlayerBackgroundLayerState,
} from "./vibe-player-background-layer-types";
import type { VibePlayerBackgroundPreviewProps } from "./vibe-player-preview-types";

const FRAME_READY_FALLBACK_MS = 2500;
const LAYER_RETIRE_DELAY_MS = 300;

const previousLayerSnapshots = new Map<
  string,
  VibePlayerBackgroundLayerSnapshot
>();

export function VibePlayerBackgroundPreview({
  paused = false,
  preserveKey,
  preservePreviousLayer = false,
  source,
}: VibePlayerBackgroundPreviewProps) {
  const activeLayerId = getLayerId(source);
  const currentLayer = useMemo(
    () => createLayerSnapshot(source, activeLayerId),
    [activeLayerId, source]
  );
  const [layers, setLayers] = useState<VibePlayerBackgroundLayerState[]>(() =>
    getInitialLayers(currentLayer, preservePreviousLayer, preserveKey)
  );
  const [readyLayerId, setReadyLayerId] = useState<string | null>(
    currentLayer.previewVideoUrl ? null : activeLayerId
  );

  const handleFrameReady = useCallback(
    (layerId: string) => {
      if (layerId === activeLayerId) {
        setReadyLayerId(layerId);
      }
    },
    [activeLayerId]
  );

  useEffect(() => {
    if (preservePreviousLayer) {
      rememberLayerSnapshot(preserveKey, currentLayer);
    }
    setReadyLayerId(currentLayer.previewVideoUrl ? null : activeLayerId);
    setLayers((current) => {
      if (current.some((layer) => layer.id === activeLayerId)) {
        return current;
      }
      return [...current, { ...currentLayer, visible: false }].slice(-2);
    });

    if (!currentLayer.previewVideoUrl) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setReadyLayerId(activeLayerId);
    }, FRAME_READY_FALLBACK_MS);
    return () => window.clearTimeout(timeoutId);
  }, [activeLayerId, currentLayer, preserveKey, preservePreviousLayer]);

  useEffect(() => {
    if (readyLayerId !== activeLayerId) {
      return;
    }
    setLayers((current) =>
      current.map((layer) => ({
        ...layer,
        visible: layer.id === activeLayerId,
      }))
    );
    const timeoutId = window.setTimeout(() => {
      setLayers((current) => {
        const activeLayer = current.find((layer) => layer.id === activeLayerId);
        return activeLayer ? [{ ...activeLayer, visible: true }] : current;
      });
    }, LAYER_RETIRE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [activeLayerId, readyLayerId]);

  return (
    <div aria-hidden className="vibe-player-background-preview">
      {layers.map((layer) => (
        <VibePlayerBackgroundLayer
          fallbackPosterUrl={layer.fallbackPosterUrl}
          id={layer.id}
          key={layer.id}
          onFrameReady={handleFrameReady}
          paused={paused}
          posterUrl={layer.posterUrl}
          previewVideoUrl={layer.previewVideoUrl}
          visible={layer.visible}
        />
      ))}
    </div>
  );
}

function createLayerSnapshot(
  source: VibePlayerBackgroundPreviewProps["source"],
  id: string
): VibePlayerBackgroundLayerSnapshot {
  return {
    id,
    posterUrl: source.posterUrl,
    ...(source.fallbackPosterUrl
      ? { fallbackPosterUrl: source.fallbackPosterUrl }
      : {}),
    ...(source.previewVideoUrl
      ? { previewVideoUrl: source.previewVideoUrl }
      : {}),
  };
}

function getInitialLayers(
  currentLayer: VibePlayerBackgroundLayerSnapshot,
  preservePreviousLayer: boolean,
  preserveKey: string | undefined
): VibePlayerBackgroundLayerState[] {
  const previousLayerSnapshot = getPreviousLayerSnapshot(preserveKey);
  if (
    preservePreviousLayer &&
    previousLayerSnapshot &&
    previousLayerSnapshot.id !== currentLayer.id
  ) {
    return [
      { ...previousLayerSnapshot, visible: true },
      { ...currentLayer, visible: false },
    ];
  }
  return [{ ...currentLayer, visible: true }];
}

function getPreviousLayerSnapshot(
  preserveKey: string | undefined
): VibePlayerBackgroundLayerSnapshot | null {
  if (!preserveKey) {
    return null;
  }
  return previousLayerSnapshots.get(preserveKey) ?? null;
}

function rememberLayerSnapshot(
  preserveKey: string | undefined,
  snapshot: VibePlayerBackgroundLayerSnapshot
): void {
  if (preserveKey) {
    previousLayerSnapshots.set(preserveKey, snapshot);
  }
}

function getLayerId(
  source: VibePlayerBackgroundPreviewProps["source"]
): string {
  return (
    source.id ??
    `${source.previewVideoUrl ?? "poster-only"}|${source.posterUrl}`
  );
}
