import type Hls from "hls.js";
import type { HlsModuleLoader } from "../adapters/hls/hls-runtime-types";

interface TestHlsEngine {
  destroyed: boolean;
  loads: readonly string[];
}

interface HlsLoaderFixture {
  engines: readonly TestHlsEngine[];
  load: HlsModuleLoader;
}

/** Only the SDK boundary is controlled; hooks, controller and adapter stay real. */
export function createHlsLoaderFixture(): HlsLoaderFixture {
  const engines: Engine[] = [];
  class Engine {
    static readonly Events = {
      ERROR: "error",
      FRAG_LOADED: "fragment",
      LEVEL_LOADED: "levelLoaded",
      LEVEL_SWITCHED: "levelSwitched",
      LEVELS_UPDATED: "levelsUpdated",
      MANIFEST_PARSED: "manifest",
      MEDIA_ATTACHED: "attached",
    };
    static isSupported() {
      return true;
    }
    readonly levels = [];
    readonly loads: string[] = [];
    destroyed = false;
    manualLevel = -1;
    nextLevel = -1;
    private readonly listeners = new Map<string, () => void>();
    constructor() {
      engines.push(this);
    }
    attachMedia(): void {
      this.listeners.get(Engine.Events.MEDIA_ATTACHED)?.();
    }
    destroy(): void {
      this.destroyed = true;
    }
    loadSource(url: string): void {
      this.loads.push(url);
      this.listeners.get(Engine.Events.MANIFEST_PARSED)?.();
    }
    on(event: string, callback: () => void): void {
      this.listeners.set(event, callback);
    }
    startLoad(): void {
      // Media decoding belongs to the browser acceptance lane.
    }
  }
  const load: HlsModuleLoader = async () => ({
    default: Engine as unknown as typeof Hls,
  });
  return { engines, load };
}
