import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createBlockedPlaybackError,
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

afterEach(cleanup);

describe("status announcement timing", () => {
  it("announces a status in the same commit that shows it", async () => {
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.playError = createBlockedPlaybackError();
      },
    });
    const { container } = render(
      <VibePlayerStage
        adapterFactory={adapterFactory}
        autoPlay
        source={stageFileSource}
      />
    );
    // Record the announcer at the first DOM change that shows the status.
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      const status = container.querySelector(".vibe-player-stage__status");
      if (status && seen.length === 0) {
        const announcer = container.querySelector('[data-part="announcer"]');
        seen.push(announcer?.textContent ?? "");
      }
    });
    observer.observe(container, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    await waitFor(() => expect(seen).toHaveLength(1));
    observer.disconnect();
    expect(seen).toEqual(["Play to start"]);
  });
});
