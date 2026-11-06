import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultHlsAdapterRuntime } from "./hls-managed-runtime";

describe("HLS engine selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps classic MediaSource in charge even when native HLS is advertised", () => {
    vi.stubGlobal("MediaSource", class {});
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "probably"
    );
    expect(
      defaultHlsAdapterRuntime.canUseManagedHls(document.createElement("video"))
    ).toBe(true);
  });

  it("chooses native HLS on ManagedMediaSource-only browsers", () => {
    vi.stubGlobal("MediaSource", undefined);
    vi.stubGlobal("ManagedMediaSource", class {});
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue(
      "probably"
    );
    expect(
      defaultHlsAdapterRuntime.canUseManagedHls(document.createElement("video"))
    ).toBe(false);
  });

  it("retains the managed path when native HLS is unavailable", () => {
    vi.stubGlobal("MediaSource", undefined);
    vi.stubGlobal("ManagedMediaSource", class {});
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("");
    expect(
      defaultHlsAdapterRuntime.canUseManagedHls(document.createElement("video"))
    ).toBe(true);
  });
});
