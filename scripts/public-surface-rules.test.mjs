import { describe, expect, it } from "vitest";
import {
  collectPublicSurfaceIssues,
  forbiddenPublicSymbols,
  requiredPublicSymbols,
} from "./public-surface-rules.mjs";

function createDeclaration(symbols) {
  return symbols
    .map((symbol) => `declare const ${symbol}: unknown;`)
    .join("\n");
}

describe("public surface rules", () => {
  it("keeps the public and forbidden symbol lists explicit", () => {
    expect(requiredPublicSymbols).toContain("VibePlayerStage");
    expect(requiredPublicSymbols).toContain(
      "canRenderVibePlayerQualityOptions"
    );
    expect(forbiddenPublicSymbols).toContain("VibePlayerToggleButton");
    expect(forbiddenPublicSymbols).toContain("loadVibePlayerControllerSource");
  });

  it("accepts declarations with required public symbols and no leaks", () => {
    const declaration = createDeclaration(requiredPublicSymbols);

    expect(collectPublicSurfaceIssues(declaration)).toEqual({
      leakedSymbols: [],
      missingSymbols: [],
    });
  });

  it("flags missing public symbols and leaked internal symbols", () => {
    const declaration = createDeclaration(
      requiredPublicSymbols
        .filter((symbol) => symbol !== "VibePlayerStage")
        .concat("VibePlayerToggleButton")
    );

    expect(collectPublicSurfaceIssues(declaration)).toEqual({
      leakedSymbols: ["VibePlayerToggleButton"],
      missingSymbols: ["VibePlayerStage"],
    });
  });
});
