import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

it("updates seek frames through the stage without loading another media session", async () => {
  const { adapterFactory, adapters } = createStageAdapterFactory();
  const props = {
    adapterFactory,
    autoHideControls: false,
    source: stageFileSource,
  };
  const { container, rerender } = render(
    <VibePlayerStage
      {...props}
      seekThumbnails={[{ endTime: 100, startTime: 0, url: "/first.jpg" }]}
    />
  );
  await waitFor(() => expect(screen.getByRole("slider")).toBeEnabled());
  fireEvent.focus(screen.getByRole("slider"));
  expect(container.querySelector("img")).toHaveAttribute("src", "/first.jpg");
  rerender(
    <VibePlayerStage
      {...props}
      seekThumbnails={[{ endTime: 100, startTime: 0, url: "/second.jpg" }]}
    />
  );
  expect(container.querySelector("img")).toHaveAttribute("src", "/second.jpg");
  expect(
    getStageAdapter(adapters).calls.filter((call) => call.startsWith("load:"))
  ).toEqual(["load:stage-video"]);
  expect(adapters).toHaveLength(1);
});
