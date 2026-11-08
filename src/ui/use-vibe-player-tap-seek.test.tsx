import { act, renderHook, waitFor } from "@testing-library/react";
import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type UseVibePlayerTapSeekOptions,
  useVibePlayerTapSeek,
} from "./use-vibe-player-tap-seek";

// A 300 px picture: x = 20 is the left third, x = 280 the right third.
const area = {
  getBoundingClientRect: () => ({ left: 0, width: 300 }),
} as Element;
const at = (clientX: number) => ({ clientX }) as MouseEvent<HTMLElement>;

async function renderTapSeek(options: Partial<UseVibePlayerTapSeekOptions>) {
  const seekTo = vi.fn();
  const single = vi.fn();
  const view = renderHook(() =>
    useVibePlayerTapSeek({
      duration: 100,
      enabled: true,
      getTime: () => 50,
      requested: true,
      seekTo,
      step: 15,
      ...options,
    })
  );
  // The gesture chunk loads after mount; until then a tap stays single.
  await act(() => import("./vibe-player-tap-seek"));
  const tap = (clientX: number) =>
    act(() => view.result.current.tap(at(clientX), area, single));
  return { seekTo, single, tap, view };
}

describe("useVibePlayerTapSeek", () => {
  it("steps from its own aim, so fast taps add up before the media moves", async () => {
    const { seekTo, single, tap } = await renderTapSeek({});
    tap(20);
    tap(20);
    tap(20);
    tap(20);
    expect(seekTo.mock.calls).toEqual([[35], [20], [5]]);
    expect(single).not.toHaveBeenCalled();
  });

  it("stays inside the media", async () => {
    const { seekTo, tap } = await renderTapSeek({ getTime: () => 92 });
    tap(280);
    tap(280);
    expect(seekTo).toHaveBeenLastCalledWith(100);
  });

  it("keeps every tap single while the media cannot seek", async () => {
    const { seekTo, single, tap } = await renderTapSeek({ enabled: false });
    tap(20);
    tap(20);
    expect(single).toHaveBeenCalledTimes(2);
    expect(seekTo).not.toHaveBeenCalled();
  });

  it("never loads the gesture unless the host asks for it", async () => {
    const { seekTo, single, tap } = await renderTapSeek({ requested: false });
    tap(20);
    tap(20);
    await waitFor(() => expect(single).toHaveBeenCalledTimes(2));
    expect(seekTo).not.toHaveBeenCalled();
  });
});
