import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerModal } from "./vibe-player-modal";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

describe("VibePlayerModal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a closing dialog from accessibility before its exit completes", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <VibePlayerModal open={true}>Modal content</VibePlayerModal>
    );

    expect(
      screen.getByRole("dialog", { name: "Video player" })
    ).toHaveAttribute("aria-modal", "true");
    rerender(<VibePlayerModal open={false}>Modal content</VibePlayerModal>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute(
      "inert"
    );
    act(() => vi.advanceTimersByTime(179));
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });

  it("dismisses outside pointer presses without dismissing content interaction", () => {
    const onClose = vi.fn();
    render(
      <VibePlayerModal onClose={onClose} open={true}>
        <button type="button">Inner action</button>
      </VibePlayerModal>
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Inner action" }));
    expect(onClose).not.toHaveBeenCalled();
    const panel = screen
      .getByRole("dialog")
      .querySelector(".vibe-player-modal__panel");
    if (!panel) {
      throw new Error("Missing outside pointer surface");
    }
    fireEvent.pointerDown(panel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("releases media immediately on close while the modal is still exiting", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const { rerender } = render(
      <VibePlayerModal
        adapterFactory={adapterFactory}
        open={true}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(getStageAdapter(adapters).calls).toContain("load:stage-video")
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );

    vi.useFakeTimers();
    await act(async () => {
      rerender(
        <VibePlayerModal
          adapterFactory={adapterFactory}
          open={false}
          source={stageFileSource}
        />
      );
    });

    expect(getStageAdapter(adapters).calls).toContain("unmount");
    expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
  });
});
