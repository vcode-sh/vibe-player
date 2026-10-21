import { describe, expect, it } from "vitest";
import { collectPublicSurfaceIssues } from "./public-surface-rules.mjs";

describe("public surface rules", () => {
  it("does not mistake a longer public identifier for the required component", () => {
    const missing = collectPublicSurfaceIssues(
      "interface VibePlayerStageProps {}"
    );
    const present = collectPublicSurfaceIssues(
      "interface VibePlayerStageProps {}\ndeclare const VibePlayerStage: unknown;"
    );

    expect(missing.missingSymbols).toContain("VibePlayerStage");
    expect(missing.missingSymbols).not.toContain("VibePlayerStageProps");
    expect(present.missingSymbols).not.toContain("VibePlayerStage");
    expect(present.missingSymbols).toContain("createFileAdapter");
  });

  it("flags exact internal symbols without rejecting longer consumer names", () => {
    const safe = collectPublicSurfaceIssues(
      "declare const MyVibePlayerToggleButton: unknown;\n" +
        "declare const VibePlayerToggleButtonProps: unknown;"
    );
    const leaked = collectPublicSurfaceIssues(
      "declare const VibePlayerToggleButton: unknown;\n" +
        "declare const loadVibePlayerControllerSource: unknown;"
    );

    expect(safe.leakedSymbols).toEqual([]);
    expect(leaked.leakedSymbols).toEqual([
      "loadVibePlayerControllerSource",
      "VibePlayerToggleButton",
    ]);
  });
});
