import { describe, expect, it } from "vitest";
import {
  collectExportNameIssues,
  collectPublicSurfaceIssues,
} from "./public-surface-rules.mjs";

describe("public surface rules", () => {
  it("requires an actual export rather than a private declaration or comment", async () => {
    const issues = await collectPublicSurfaceIssues(
      "// export interface VibePlayerStageProps {}\ninterface VibePlayerStageProps {}",
      ["VibePlayerStageProps"]
    );

    expect(issues.missingSymbols).toContain("VibePlayerStageProps");
  });

  it("accepts private support types referenced by an exported contract", async () => {
    const issues = await collectPublicSurfaceIssues(
      "interface VibePlayerToggleButton {}\n" +
        "interface VibePlayerStageProps { button: VibePlayerToggleButton; }\n" +
        "export type { VibePlayerStageProps };",
      ["VibePlayerStageProps"]
    );

    expect(issues).toEqual({ leakedSymbols: [], missingSymbols: [] });
  });

  it("checks exported aliases and rejects an unreviewed new export", async () => {
    const issues = await collectPublicSurfaceIssues(
      "interface InternalProps {}\n" +
        "export { type InternalProps as VibePlayerStageProps };\n" +
        "export declare const AccidentalHelper: string;",
      ["VibePlayerStageProps"]
    );

    expect(issues).toEqual({
      leakedSymbols: ["AccidentalHelper"],
      missingSymbols: [],
    });
  });

  it("detects a runtime export erased by a type-only public reexport", async () => {
    const declarations = await collectPublicSurfaceIssues(
      "declare class VibePlayerController {}\nexport type { VibePlayerController };",
      ["VibePlayerController"]
    );
    const runtime = collectExportNameIssues([], ["VibePlayerController"]);

    expect(declarations).toEqual({ leakedSymbols: [], missingSymbols: [] });
    expect(runtime).toEqual({
      leakedSymbols: [],
      missingSymbols: ["VibePlayerController"],
    });
  });

  it("keeps value and type exports while distinguishing similar names", async () => {
    const issues = await collectPublicSurfaceIssues(
      "export interface VibePlayerStageProps {}\n" +
        "export declare const MyVibePlayerStage: string;",
      ["VibePlayerStage", "VibePlayerStageProps", "MyVibePlayerStage"]
    );

    expect(issues).toEqual({
      leakedSymbols: [],
      missingSymbols: ["VibePlayerStage"],
    });
  });
});
