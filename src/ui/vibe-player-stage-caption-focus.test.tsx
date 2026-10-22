import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VibePlayerModal } from "./vibe-player-modal";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

describe("caption retry focus", () => {
  it("keeps keyboard focus in the modal when successful retry removes its button", async () => {
    const { adapterFactory } = createStageAdapterFactory();
    const loadCaptionText = vi
      .fn()
      .mockRejectedValueOnce(new Error("Caption service unavailable"))
      .mockResolvedValueOnce(
        "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nRecovered"
      );
    render(
      <VibePlayerModal
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        open
        source={{
          ...stageFileSource,
          captions: [
            {
              default: true,
              id: "en",
              kind: "captions",
              label: "English",
              language: "en",
              url: "/en.vtt",
            },
          ],
        }}
      />
    );
    const retry = await screen.findByRole("button", { name: "Retry captions" });
    const dialog = screen.getByRole("dialog");
    act(() => retry.focus());
    expect(retry).toHaveFocus();

    fireEvent.click(retry);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Retry captions" })
      ).toBeNull()
    );
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
