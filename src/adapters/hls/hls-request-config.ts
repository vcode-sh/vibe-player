import type { HlsConfig } from "hls.js";

/** The source policy applies to every playlist, fragment and key request. */
export function createHlsRequestConfig(
  video: HTMLVideoElement
): Pick<HlsConfig, "fetchSetup" | "xhrSetup"> {
  const withCredentials = video.crossOrigin === "use-credentials";
  return {
    fetchSetup: (context, init: RequestInit) =>
      new Request(context.url, {
        ...init,
        credentials: withCredentials ? "include" : "same-origin",
      }),
    xhrSetup: (xhr) => {
      xhr.withCredentials = withCredentials;
    },
  };
}
