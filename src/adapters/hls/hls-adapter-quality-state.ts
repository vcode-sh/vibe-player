import type { VibePlayerQualityOption } from "../../core/vibe-player-types";
import {
  createHlsLevelQualityId,
  createHlsQualityOptions,
  hlsAutoQualityId,
  type ManagedHlsLevel,
  parseHlsQualityId,
  selectHlsQualityOption,
} from "./hls-quality";
import type { ManagedHlsController } from "./hls-runtime-types";

export interface HlsAdapterQualityState {
  readonly options: VibePlayerQualityOption[];
  reset: () => void;
  select: (
    qualityId: string,
    controller: ManagedHlsController | null
  ) => boolean;
  readonly supportsSelection: boolean;
  update: (levels: ManagedHlsLevel[], selectedLevelIndex: number) => void;
}

export function createHlsAdapterQualityState(): HlsAdapterQualityState {
  return new MutableHlsAdapterQualityState();
}

class MutableHlsAdapterQualityState implements HlsAdapterQualityState {
  private currentOptions: VibePlayerQualityOption[] = [];

  get options(): VibePlayerQualityOption[] {
    return this.currentOptions;
  }

  get supportsSelection(): boolean {
    return this.currentOptions.length > 2;
  }

  reset(): void {
    this.currentOptions = [];
  }

  select(qualityId: string, controller: ManagedHlsController | null): boolean {
    const levelIndex = parseHlsQualityId(qualityId);
    if (!(controller && levelIndex !== null)) {
      return false;
    }
    controller.setQualityLevel(levelIndex);
    this.currentOptions = selectHlsQualityOption(
      this.currentOptions,
      levelIndex < 0 ? hlsAutoQualityId : createHlsLevelQualityId(levelIndex)
    );
    return true;
  }

  update(levels: ManagedHlsLevel[], selectedLevelIndex: number): void {
    this.currentOptions = createHlsQualityOptions(levels, selectedLevelIndex);
  }
}
