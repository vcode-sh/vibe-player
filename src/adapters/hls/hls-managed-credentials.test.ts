import { type HlsConfig, type LoaderContext, LoaderContextType } from "hls.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHlsAdapter } from "./create-hls-adapter";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";

const probe = vi.hoisted(() => ({
  config: null as Partial<HlsConfig> | null,
  constructed: false,
}));

vi.mock("hls.js", async (importOriginal) => ({
  default: class {
    static Events = {
      ERROR: "error",
      LEVEL_LOADED: "levelLoaded",
      LEVEL_SWITCHED: "levelSwitched",
      LEVELS_UPDATED: "levelsUpdated",
      MANIFEST_PARSED: "manifestParsed",
    };
    static isSupported = () => true;
    levels = [];
    manualLevel = -1;
    constructor(config: Partial<HlsConfig>) {
      probe.constructed = true;
      probe.config = config;
    }
    attachMedia = () => undefined;
    destroy = () => undefined;
    loadSource = () => undefined;
    on = () => undefined;
  },
  LoaderContextType: (await importOriginal<typeof import("hls.js")>())
    .LoaderContextType,
}));

function getConfig(): Partial<HlsConfig> {
  if (!probe.constructed) {
    throw new Error("The managed runtime did not construct its SDK.");
  }
  return probe.config ?? {};
}

describe("managed HLS request credentials", () => {
  afterEach(() => {
    probe.config = null;
    probe.constructed = false;
    vi.restoreAllMocks();
  });

  it.each([
    {
      credentials: "same-origin",
      crossOrigin: undefined,
      withCredentials: false,
    },
    {
      credentials: "same-origin",
      crossOrigin: "anonymous",
      withCredentials: false,
    },
    {
      credentials: "include",
      crossOrigin: "use-credentials",
      withCredentials: true,
    },
  ] as const)(
    "honors $crossOrigin for every SDK request",
    async ({ crossOrigin, credentials, withCredentials }) => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
        () => undefined
      );
      const adapter = createHlsAdapter({
        ...defaultHlsAdapterRuntime,
        canUseManagedHls: () => true,
      });
      await adapter.mount(document.createElement("div"));
      await adapter.load({
        id: "private-hls",
        manifestUrl: "https://media.example/master.m3u8",
        type: "hls",
        ...(crossOrigin ? { crossOrigin } : {}),
      });
      const { fetchSetup, xhrSetup } = getConfig();
      await Promise.all(
        (
          [
            ["master.m3u8", LoaderContextType.MANIFEST],
            ["segment.ts", LoaderContextType.MEDIA_FRAGMENT],
            ["key.bin", LoaderContextType.KEY],
          ] as const
        ).map(async ([resource, type]) => {
          const context: LoaderContext = {
            responseType: "arraybuffer",
            type,
            url: `https://media.example/${resource}`,
          };
          const xhr = new XMLHttpRequest();
          await xhrSetup?.(xhr, context.url, context);
          const init = {
            headers: { "X-Media-Request": resource },
            method: "GET",
          };
          const request = await (fetchSetup?.(context, init) ??
            new Request(context.url, init));
          expect(xhr.withCredentials).toBe(withCredentials);
          expect(request.credentials).toBe(credentials);
          expect(request.url).toBe(context.url);
          expect(request.headers.get("X-Media-Request")).toBe(resource);
        })
      );
      await adapter.unmount();
    }
  );
});
