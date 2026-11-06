import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { VibePlayerStage } from "./vibe-player-stage";
import {
  createStageAdapterFactory,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";

interface HostDialogProps {
  children: ReactNode;
  onEscape: () => void;
}

/** Like Base UI: a document listener that ignores `defaultPrevented`. */
function HostDialog({ children, onEscape }: HostDialogProps) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onEscape]);
  return (
    <div aria-label="Host viewer" aria-modal="true" role="dialog">
      {children}
    </div>
  );
}

describe("standalone stage inside a host dialog", () => {
  it("takes initial focus and lets Escape reach the host once its own popover is closed", async () => {
    const onEscape = vi.fn();
    const { adapterFactory } = createStageAdapterFactory({
      configure: (adapter) => {
        Object.assign(adapter.capabilities, { supportsVolumeControl: true });
      },
    });
    render(
      <HostDialog onEscape={onEscape}>
        <VibePlayerStage
          adapterFactory={adapterFactory}
          autoFocus
          source={stageFileSource}
          variant="full"
        />
      </HostDialog>
    );
    expect(
      screen.getByRole("region", { name: "Stage demo video player" })
    ).toHaveFocus();
    const trigger = await screen.findByRole("button", {
      name: "Mute, volume 100%",
    });
    act(() => trigger.focus());
    const slider = screen.getByRole("slider", { name: "Volume" });
    act(() => slider.focus());
    expect(screen.getByRole("dialog", { name: "Volume" })).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Volume" })).toBeNull()
    );
    expect(onEscape).not.toHaveBeenCalled();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("region", { name: "Stage demo video player" })
    ).toBeInTheDocument();
  });
});
