import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { VibePlayerController } from "../core/vibe-player-controller";
import { VibePlayerCompact } from "./vibe-player-compact";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

afterEach(cleanup);

describe("a mounted player after retire()", () => {
  it("shows the idle player at once instead of the last playing frame", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const controllerRef = createRef<VibePlayerController>();
    const events: string[] = [];
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        controllerRef={controllerRef}
        onEvent={(event) => events.push(event.type)}
        onStateChange={() => events.push("state")}
        source={stageFileSource}
      />
    );
    await act(() => controllerRef.current?.play());
    const root = container.querySelector(".vibe-player-compact");
    expect(root).toHaveAttribute("data-state", "playing");
    events.length = 0;

    act(() => {
      controllerRef.current?.retire().catch(() => undefined);
    });
    expect(root).toHaveAttribute("data-state", "idle");
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(controllerRef.current?.getState().currentSource).toBeNull();
    await act(async () => undefined);
    expect(getStageAdapter(adapters).calls).toContain("unmount");
    expect(events).toEqual([]);
  });
});
