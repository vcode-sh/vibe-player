import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getPlayerAnnouncer,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

const source: VibePlayerFileSource = {
  ...stageFileSource,
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/en.vtt",
    },
  ],
};

describe("stage caption availability", () => {
  it("reports caption failure while keeping video playable and offers a successful retry", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) =>
        adapter.setSnapshot({ ...adapter.getSnapshot(), currentTime: 1.5 }),
    });
    const cause = new Error("Caption CDN unavailable");
    const loadCaptionText = vi
      .fn()
      .mockRejectedValueOnce(cause)
      .mockResolvedValueOnce(
        "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nRecovered caption"
      );
    const onCaptionStatusChange = vi.fn();
    const onError = vi.fn();
    render(
      <VibePlayerStage
        adapterFactory={async () => adapterFactory()}
        loadCaptionText={loadCaptionText}
        onCaptionStatusChange={onCaptionStatusChange}
        onError={onError}
        source={source}
      />
    );

    // The visible notice; the player's announcer speaks it (one status).
    await waitFor(() =>
      expect(getPlayerAnnouncer()).toHaveTextContent("Captions unavailable")
    );
    expect(
      screen.getByText("Captions unavailable", {
        selector: ".vibe-player-stage__caption-status span",
      })
    ).toBeVisible();
    // The status observer runs in a passive effect after the commit that
    // rendered the status, so it is awaited rather than read synchronously.
    await waitFor(() =>
      expect(onCaptionStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error: cause,
          loading: false,
          track: expect.objectContaining({ id: "en" }),
        })
      )
    );
    expect(onError).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry captions" }));
    await waitFor(() =>
      expect(screen.getByText("Recovered caption")).toBeVisible()
    );
    expect(screen.queryByText("Captions unavailable")).toBeNull();
    expect(getPlayerAnnouncer().textContent).toBe("");
    await waitFor(() =>
      expect(onCaptionStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: null, loading: false })
      )
    );
    expect(adapters).toHaveLength(1);
  });
});
