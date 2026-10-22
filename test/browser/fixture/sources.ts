import type { VibePlayerSource } from "vibe-player";

export function createSource(
  provider: "file" | "hls",
  credentialed = false
): VibePlayerSource {
  const captions = [
    {
      default: true,
      id: "en",
      kind: "captions" as const,
      label: "English",
      language: "en",
      url: "/media/captions.vtt",
    },
  ];
  if (provider === "hls") {
    return {
      captions,
      ...(credentialed ? { crossOrigin: "use-credentials" as const } : {}),
      id: "local-hls",
      manifestUrl: credentialed
        ? "http://127.0.0.1:5198/media/master.m3u8"
        : "/media/master.m3u8",
      title: "Local HLS",
      type: "hls",
    };
  }
  return {
    captions,
    id: "local-file",
    sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
    title: "Local file",
    type: "file",
  };
}
