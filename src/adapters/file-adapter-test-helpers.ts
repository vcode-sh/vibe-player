import { vi } from "vitest";
import type {
  VibePlayerAdapter,
  VibePlayerFileSource,
  VibePlayerHlsSource,
} from "../core/vibe-player-types";
import { createFileAdapter } from "./create-file-adapter";
import { getMountedNativeVideo } from "./native-video-test-helpers";

export interface LoadedFileAdapterHarness {
  adapter: VibePlayerAdapter;
  target: HTMLDivElement;
  video: HTMLVideoElement;
}

export const fileSource: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/captions.vtt",
    },
  ],
  id: "file-video",
  posterUrl: "https://example.com/poster.jpg",
  sources: [
    {
      mimeType: "video/mp4",
      url: "https://example.com/video.mp4",
    },
    {
      mimeType: "video/webm",
      url: "https://example.com/video.webm",
    },
  ],
  title: "File video",
  type: "file",
};

export const emptyFileSource: VibePlayerFileSource = {
  id: "empty",
  sources: [],
  type: "file",
};

export const hlsSource: VibePlayerHlsSource = {
  id: "hls",
  manifestUrl: "https://example.com/stream.m3u8",
  type: "hls",
};

export function createSingleFileSource(): VibePlayerFileSource {
  return {
    ...fileSource,
    autoPlay: true,
    sources: [
      {
        mimeType: "video/mp4",
        url: "https://example.com/video.mp4",
      },
    ],
  };
}

export async function createLoadedFileAdapter(
  source: VibePlayerFileSource = fileSource
): Promise<LoadedFileAdapterHarness> {
  mockNativeVideoLoad();
  const adapter = createFileAdapter();
  const target = document.createElement("div");

  await adapter.mount(target);
  await adapter.load(source);

  return {
    adapter,
    target,
    video: getMountedNativeVideo(target),
  };
}

export function mockNativeVideoLoad(): void {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
}
