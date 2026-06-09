import { describe, expect, it } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { createVibePlayerYouTubeWatchUrl } from "../core";
import { createVibePlayerAdapter } from "./create-vibe-player-adapter";
import { createYouTubeExternalAdapter } from "./create-youtube-external-adapter";
import { collectYouTubeAdapterEvents } from "./youtube-adapter-test-helpers";

const externalYouTubeSource = {
  externalActionLabel: "Open on YouTube",
  id: "youtube-external",
  posterUrl: "https://example.com/poster.jpg",
  presentation: "external" as const,
  startSeconds: 12,
  title: "External YouTube video",
  type: "youtube" as const,
  youtubeVideoId: "dQw4w9WgXcQ",
};

describe("createYouTubeExternalAdapter", () => {
  it("renders a compliant external handoff without an iframe", async () => {
    const adapter = createYouTubeExternalAdapter();
    const events = collectYouTubeAdapterEvents(adapter);
    const target = document.createElement("div");

    await adapter.mount(target);
    await adapter.load(externalYouTubeSource);

    const link = target.querySelector("a");
    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link?.href).toBe(
      createVibePlayerYouTubeWatchUrl(externalYouTubeSource)
    );
    expect(link?.rel).toBe("noopener");
    expect(link?.target).toBe("_blank");
    expect(link?.textContent).toContain("YouTube");
    expect(link?.textContent).toContain("External YouTube video");
    expect(link?.textContent).toContain("Open on YouTube");
    expect(target.querySelector("iframe")).toBeNull();
    expect(adapter.capabilities.supportsPlayback).toBe(false);
    expect(adapter.getSnapshot().readyState).toBe("ready");
    expect(events.at(-1)?.type).toBe("ready");
  });

  it("is selected by the default factory for external YouTube presentation", () => {
    const adapter = createVibePlayerAdapter(externalYouTubeSource);

    expect(adapter.kind).toBe("youtube");
    expect(adapter.capabilities.supportsPlayback).toBe(false);
  });

  it("rejects unsupported source shapes", async () => {
    const adapter = createYouTubeExternalAdapter();
    const fileSource: VibePlayerFileSource = {
      id: "file",
      sources: [{ mimeType: "video/mp4", url: "https://example.com/file.mp4" }],
      type: "file",
    };

    await expect(adapter.load(fileSource)).rejects.toThrow(
      "YouTube external adapter cannot load file sources."
    );
  });
});
