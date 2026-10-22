import { publicApiExports } from "./public-api-exports.mjs";
import { inspectTypeScriptFiles } from "./typescript-inspection.mjs";

export async function collectPublicSurfaceIssues(
  declaration,
  expectedExports = publicApiExports
) {
  const exportedNames = await inspectTypeScriptFiles(
    [{ path: "index.d.ts", source: declaration }],
    async (project, root) => {
      const sourceFile = await project.program.getSourceFile(
        `${root}/index.d.ts`
      );
      const symbol = await project.checker.getSymbolAtLocation(sourceFile);
      if (!symbol) {
        return [];
      }
      const exports = await project.checker.getExportsOfModule(symbol);
      return exports.map((entry) => entry.name).sort();
    }
  );
  return collectExportNameIssues(exportedNames, expectedExports);
}

export function collectExportNameIssues(exportedNames, expectedExports) {
  const actual = new Set(exportedNames);
  const expected = new Set(expectedExports);
  return {
    leakedSymbols: exportedNames.filter((name) => !expected.has(name)),
    missingSymbols: [...expected].filter((name) => !actual.has(name)).sort(),
  };
}
