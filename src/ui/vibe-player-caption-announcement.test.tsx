import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { VibePlayerStage } from "./vibe-player-stage";
import { createStageAdapterFactory } from "./vibe-player-stage-test-helpers";

afterEach(cleanup);

const source: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "https://example.com/en.vtt",
    },
  ],
  id: "caption-announcement",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  type: "file",
};

function getAnnouncer(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>(
    '[data-part="announcer"]'
  );
  if (!region) {
    throw new Error("Missing player announcer.");
  }
  return region;
}

describe("caption failure announcement", () => {
  it("speaks a caption failure through the player's one status region", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const loadCaptionText = vi
      .fn()
      .mockRejectedValueOnce(new Error("Caption request failed"))
      .mockResolvedValueOnce(
        "WEBVTT\n\n00:00:00.000 --> 00:00:09.000\nRecovered caption"
      );
    const { container } = render(
      <VibePlayerStage
        adapterFactory={async () => adapterFactory()}
        loadCaptionText={loadCaptionText}
        source={source}
      />
    );
    const announcer = getAnnouncer(container);
    await waitFor(() =>
      expect(announcer).toHaveTextContent("Captions unavailable")
    );

    // The visible notice and its retry stay, without a second live region.
    const notice = screen.getByText("Captions unavailable", {
      selector: ".vibe-player-stage__caption-status span",
    }).parentElement;
    expect(notice).not.toHaveAttribute("role");
    expect(notice).not.toHaveAttribute("aria-live");
    expect(
      container.querySelectorAll('[role="status"], [aria-live], output')
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry captions" }));
    await waitFor(() =>
      expect(screen.getByText("Recovered caption")).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: "Retry captions" })).toBeNull();
    // A status that ended is withdrawn, so browsing never finds it stale.
    expect(announcer).toHaveTextContent("");
  });
});
