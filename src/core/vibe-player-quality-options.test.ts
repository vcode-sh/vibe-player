import { describe, expect, it } from "vitest";
import {
  canRenderVibePlayerQualityOptions,
  createIdleCapabilities,
  getSelectedVibePlayerQualityOption,
} from ".";

const options = [
  { auto: true, id: "auto", label: "Auto", selected: false },
  { auto: false, height: 720, id: "level:0", label: "720p", selected: true },
];

describe("vibe player quality option helpers", () => {
  it("returns the selected option or falls back to the first option", () => {
    expect(getSelectedVibePlayerQualityOption(options)).toEqual(options[1]);
    expect(
      getSelectedVibePlayerQualityOption([
        { auto: true, id: "auto", label: "Auto", selected: false },
      ])
    ).toEqual({ auto: true, id: "auto", label: "Auto", selected: false });
    expect(getSelectedVibePlayerQualityOption([])).toBeNull();
    expect(getSelectedVibePlayerQualityOption(undefined)).toBeNull();
  });

  it("renders quality UI only when provider capability and options exist", () => {
    const unsupported = createIdleCapabilities();
    const supported = {
      ...unsupported,
      supportsQualitySelection: true,
    };

    expect(canRenderVibePlayerQualityOptions(supported, options)).toBe(true);
    expect(canRenderVibePlayerQualityOptions(unsupported, options)).toBe(false);
    expect(canRenderVibePlayerQualityOptions(supported, [])).toBe(false);
    expect(canRenderVibePlayerQualityOptions(supported, undefined)).toBe(false);
  });
});
