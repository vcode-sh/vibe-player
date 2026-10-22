import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerModal } from "./vibe-player-modal";

function createOpener() {
  const opener = document.createElement("button");
  opener.textContent = "Open player";
  document.body.append(opener);
  opener.focus();
  return opener;
}

describe("modal accessibility lifecycle", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("focuses children, dismisses Escape and restores the opener on close", () => {
    const opener = createOpener();
    document.body.style.overflow = "scroll";
    const onClose = vi.fn();
    const { rerender, unmount } = render(
      <VibePlayerModal onClose={onClose} open>
        <button type="button">Inside player</button>
      </VibePlayerModal>
    );
    const inside = screen.getByRole("button", { name: "Inside player" });
    expect(inside).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(inside, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <VibePlayerModal onClose={onClose} open={false}>
        <button type="button">Inside player</button>
      </VibePlayerModal>
    );
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("scroll");
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    opener.remove();
  });

  it("lets an inner popover consume Escape before dismissing the modal", () => {
    const onClose = vi.fn();
    render(
      <VibePlayerModal onClose={onClose} open>
        <button
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
            }
          }}
          type="button"
        >
          Popover action
        </button>
      </VibePlayerModal>
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Popover action" }), {
      key: "Escape",
    });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the outer scroll lock and restores its trigger after an inner modal closes", () => {
    const opener = createOpener();
    document.body.style.setProperty("overflow", "scroll", "important");
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    function NestedModals({
      outer,
      inner,
    }: {
      outer: boolean;
      inner: boolean;
    }) {
      return (
        <VibePlayerModal onClose={outerClose} open={outer} title="Outer">
          <button type="button">Open inner</button>
          <VibePlayerModal onClose={innerClose} open={inner} title="Inner">
            <button type="button">Inner action</button>
          </VibePlayerModal>
        </VibePlayerModal>
      );
    }
    const { rerender, unmount } = render(<NestedModals inner={false} outer />);
    const trigger = screen.getByRole("button", { name: "Open inner" });
    trigger.focus();
    rerender(<NestedModals inner outer />);
    const action = screen.getByRole("button", { name: "Inner action" });
    expect(action).toHaveFocus();
    fireEvent.keyDown(action, { key: "Escape" });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();

    rerender(<NestedModals inner={false} outer />);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<NestedModals inner={false} outer={false} />);
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.getPropertyPriority("overflow")).toBe(
      "important"
    );
    unmount();
    opener.remove();
  });

  it("focuses a static dialog and restores focus when the owner unmounts", () => {
    const opener = createOpener();
    const { unmount } = render(
      <VibePlayerModal open>Player information</VibePlayerModal>
    );
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    opener.remove();
  });
});
