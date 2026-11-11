import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibePlayerFramePicker } from "./vibe-player-frame-picker";
import type { VibePlayerFramePickerProps } from "./vibe-player-frame-picker-types";
import type { VibePlayerSeekThumbnail } from "./vibe-player-seek-thumbnail-types";
import {
  createStageAdapterFactory,
  getStageAdapter,
  stageFileSource,
  type TestStageAdapter,
} from "./vibe-player-stage-test-helpers";

// The stage test adapter reports a 100 s duration unless a test changes it.
const tiles: VibePlayerSeekThumbnail[] = [
  { endTime: 20, startTime: 0, url: "/tile-0.jpg" },
  { endTime: 100, startTime: 20, url: "/tile-1.jpg" },
];

afterEach(cleanup);
beforeEach(() => {
  // The rail measures 200 px wide from x = 0.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 48)
  );
  return () => vi.restoreAllMocks();
});

type PickerProps = Omit<VibePlayerFramePickerProps, "adapterFactory">;

async function renderPicker(
  props: Partial<PickerProps> = {},
  configure?: (adapter: TestStageAdapter) => void
) {
  const harness = createStageAdapterFactory(configure ? { configure } : {});
  const onChange = vi.fn<(seconds: number) => void>();
  const view = (next: Partial<PickerProps>) => (
    <VibePlayerFramePicker
      adapterFactory={harness.adapterFactory}
      onChange={onChange}
      source={stageFileSource}
      value={5}
      {...props}
      {...next}
    />
  );
  const result = await act(async () => render(view({})));
  return {
    adapter: () => getStageAdapter(harness.adapters),
    onChange,
    rerender: (next: Partial<PickerProps>) =>
      act(async () => {
        result.rerender(view(next));
      }),
    slider: screen.getByRole("slider", { name: "Cover frame" }),
  };
}

function seeks(adapter: TestStageAdapter): string[] {
  return adapter.calls.filter((call) => call.startsWith("seek:"));
}

function tileImage() {
  return document.querySelector("[data-part='tile'] img");
}

/** Seeks wait for `release()`, as an HLS segment load does. */
function holdSeeks(adapter: TestStageAdapter) {
  const pending: (() => void)[] = [];
  adapter.seekTo = (seconds) => {
    adapter.calls.push(`seek:${seconds}`);
    adapter.setSnapshot({ ...adapter.getSnapshot(), currentTime: seconds });
    return new Promise((resolve) => pending.push(() => resolve()));
  };
  return pending;
}

describe("VibePlayerFramePicker", () => {
  it("stays disabled until the duration is known, then seeks to the value", async () => {
    const { adapter, onChange, slider } = await renderPicker({}, (created) => {
      created.setSnapshot({ ...created.getSnapshot(), duration: 0 });
    });
    expect(slider).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
    expect(seeks(adapter())).toEqual([]);

    await act(async () => {
      adapter().emitEvent("durationchange", { duration: 20 });
    });
    expect(slider).not.toHaveAttribute("aria-disabled");
    expect(slider).toHaveAttribute("aria-valuemax", "20");
    expect(slider).toHaveAttribute("aria-valuenow", "5");
    expect(slider).toHaveAttribute("aria-valuetext", "0:05.0 of 0:20");
    expect(seeks(adapter())).toEqual(["seek:5"]);
  });

  it("seeks the frame to each new value", async () => {
    const { adapter, rerender } = await renderPicker({ value: 5 });
    await rerender({ value: 42.5 });
    expect(seeks(adapter())).toEqual(["seek:5", "seek:42.5"]);
  });

  it("clamps a value past the end and reports the clamped time once", async () => {
    const { adapter, onChange, slider } = await renderPicker({ value: 150 });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(100);
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    expect(seeks(adapter())).toEqual(["seek:100"]);
  });

  it.each([
    ["ArrowRight", 5.1],
    ["ArrowUp", 5.1],
    ["ArrowLeft", 4.9],
    ["ArrowDown", 4.9],
    ["PageUp", 6],
    ["PageDown", 4],
    ["Home", 0],
    ["End", 100],
  ])("moves the pick with %s", async (key, expected) => {
    const { onChange, slider } = await renderPicker({ value: 5 });
    fireEvent.keyDown(slider, { key });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("stops key steps at both ends", async () => {
    const end = await renderPicker({ value: 99.95 });
    fireEvent.keyDown(end.slider, { key: "ArrowRight" });
    fireEvent.keyDown(end.slider, { key: "PageUp" });
    expect(end.onChange.mock.calls).toEqual([[100], [100]]);
    cleanup();

    const start = await renderPicker({ value: 0 });
    fireEvent.keyDown(start.slider, { key: "ArrowLeft" });
    fireEvent.keyDown(start.slider, { key: "Home" });
    expect(start.onChange).not.toHaveBeenCalled();
  });

  it("reports the time under the pointer on press and while dragging only", async () => {
    const { onChange, slider } = await renderPicker({ value: 5 });
    fireEvent.pointerDown(slider, { button: 0, clientX: 50, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 260, pointerId: 1 });
    fireEvent.pointerUp(slider, { clientX: 260, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 20, pointerId: 1 });
    expect(onChange.mock.calls).toEqual([[25], [50], [100]]);
  });

  it("covers the frame with the storyboard tile while a seek is in flight", async () => {
    let pending: (() => void)[] = [];
    const { adapter, rerender } = await renderPicker(
      { seekThumbnails: tiles, value: 10 },
      (created) => {
        pending = holdSeeks(created);
      }
    );
    expect(seeks(adapter())).toEqual(["seek:10"]);
    expect(tileImage()).toHaveAttribute("src", "/tile-0.jpg");

    // A drag while the seek loads moves the tile, not a second seek.
    await rerender({ value: 30 });
    expect(tileImage()).toHaveAttribute("src", "/tile-1.jpg");
    expect(seeks(adapter())).toEqual(["seek:10"]);

    // Only the latest wanted time is seeked once the first settles.
    await act(async () => pending.shift()?.());
    expect(seeks(adapter())).toEqual(["seek:10", "seek:30"]);
    expect(tileImage()).toHaveAttribute("src", "/tile-1.jpg");

    // An acknowledged seek still buffering keeps the tile until `seeked`.
    adapter().setSnapshot({
      ...adapter().getSnapshot(),
      readyState: "buffering",
    });
    await act(async () => pending.shift()?.());
    expect(tileImage()).not.toBeNull();
    await act(async () => {
      adapter().emitEvent("seeked", { readyState: "ready" });
    });
    expect(tileImage()).toBeNull();
    expect(seeks(adapter())).toEqual(["seek:10", "seek:30"]);
  });
});
