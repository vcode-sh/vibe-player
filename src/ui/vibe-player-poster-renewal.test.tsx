import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core";
import { VibePlayerCompact } from "./vibe-player-compact";
import {
  createStageAdapterFactory,
  getPlayerAnnouncer,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

const expired: VibePlayerFileSource = {
  ...stageFileSource,
  expiresAt: Date.now() - 1000,
  posterUrl: "https://example.com/poster.jpg?grant=old",
};
const renewed: VibePlayerFileSource = {
  ...stageFileSource,
  expiresAt: Date.now() + 600_000,
  posterUrl: "https://example.com/poster.jpg?grant=new",
};

function poster(container: HTMLElement): HTMLImageElement {
  const image = container.querySelector("img");
  if (!image) {
    throw new Error("Missing poster image.");
  }
  return image;
}

describe("expired poster grant", () => {
  it("renews once without loading media and plays the renewed delivery", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const renewSource = vi.fn(() => Promise.resolve(renewed));
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        renewSource={renewSource}
        source={expired}
      />
    );
    // An image request settles after the binding has prepared its source.
    await act(async () => undefined);
    fireEvent.error(poster(container));
    await waitFor(() =>
      expect(poster(container)).toHaveAttribute("src", renewed.posterUrl)
    );
    fireEvent.error(poster(container));
    fireEvent.error(poster(container));
    expect(renewSource).toHaveBeenCalledOnce();
    expect(adapters).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    // The expired original would have renewed again before playing.
    expect(renewSource).toHaveBeenCalledOnce();
  });

  it("keeps the idle poster and Play when renewal fails", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const renewSource = vi.fn(() => Promise.reject(new Error("revoked")));
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        renewSource={renewSource}
        source={expired}
      />
    );
    // An image request settles after the binding has prepared its source.
    await act(async () => undefined);
    fireEvent.error(poster(container));
    fireEvent.error(poster(container));
    await waitFor(() => expect(renewSource).toHaveBeenCalledOnce());
    expect(poster(container)).toHaveAttribute("src", expired.posterUrl);
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
    // Nothing busy or failed was announced for the poster.
    expect(getPlayerAnnouncer().textContent).toBe("");
    expect(adapters).toHaveLength(0);
  });
});
