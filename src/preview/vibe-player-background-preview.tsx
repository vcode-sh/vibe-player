import { useCallback, useEffect, useMemo, useState } from "react";
import { VibePlayerBackgroundLayer } from "./vibe-player-background-layer";
import type {
  VibePlayerBackgroundLayerSnapshot,
  VibePlayerBackgroundLayerState,
  VibePlayerBackgroundPreviewProps,
} from "./vibe-player-preview-types";

const FRAME_READY_FALLBACK_MS = 2500;
const LAYER_RETIRE_DELAY_MS = 300;

let previousLayerSnapshot: VibePlayerBackgroundLayerSnapshot | null = null;

export function VibePlayerBackgroundPreview({
  paused = false,
  preservePreviousLayer = false,
  source,
}: VibePlayerBackgroundPreviewProps) {
  const activeLayerId = getLayerId(source);
  const currentLayer = useMemo(
    () => createLayerSnapshot(source, activeLayerId),
    [activeLayerId, source]
  );
  const [layers, setLayers] = useState<VibePlayerBackgroundLayerState[]>(() =>
    getInitialLayers(currentLayer, preservePreviousLayer)
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
    previousLayerSnapshot = currentLayer;
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
  }, [activeLayerId, currentLayer]);

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
  preservePreviousLayer: boolean
): VibePlayerBackgroundLayerState[] {
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

function getLayerId(
  source: VibePlayerBackgroundPreviewProps["source"]
): string {
  return (
    source.id ??
    `${source.previewVideoUrl ?? "poster-only"}|${source.posterUrl}`
  );
}
