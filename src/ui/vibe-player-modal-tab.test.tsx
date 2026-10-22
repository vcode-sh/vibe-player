import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VibePlayerModal } from "./vibe-player-modal";

describe("modal keyboard focus boundaries", () => {
  it("wraps Tab and Shift+Tab across visible enabled controls", () => {
    render(
      <VibePlayerModal open>
        <button disabled type="button">
          Disabled first
        </button>
        <div hidden>
          <button type="button">Hidden first</button>
        </div>
        <button tabIndex={-1} type="button">
          Programmatic action
        </button>
        <button type="button">First action</button>
        <a href="#player">Player information</a>
        <button type="button">Last action</button>
        <div style={{ display: "none" }}>
          <button type="button">Invisible last</button>
        </div>
        <div inert>
          <button type="button">Inert last</button>
        </div>
      </VibePlayerModal>
    );
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });
    act(() => last.focus());

    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    const programmatic = screen.getByRole("button", {
      name: "Programmatic action",
    });
    act(() => programmatic.focus());
    fireEvent.keyDown(programmatic, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("keeps Tab in a dialog with static content", () => {
    render(<VibePlayerModal open>Player information</VibePlayerModal>);
    const dialog = screen.getByRole("dialog", { name: "Video player" });
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      throw new Error("Missing initial modal focus");
    }
    expect(dialog).toContainElement(active);

    expect(fireEvent.keyDown(active, { key: "Tab" })).toBe(false);
    expect(active).toHaveFocus();
    expect(fireEvent.keyDown(active, { key: "Tab", shiftKey: true })).toBe(
      false
    );
    expect(active).toHaveFocus();
  });
});
