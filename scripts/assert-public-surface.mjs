import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  publicApiExports,
  publicRuntimeExports,
} from "./public-api-exports.mjs";
import { publicSubpathExports } from "./public-subpath-exports.mjs";
import {
  collectExportNameIssues,
  collectPublicModuleSurfaceIssues,
} from "./public-surface-rules.mjs";

const distPath = resolve(import.meta.dirname, "../dist");
const files = await readdir(distPath, { recursive: true });
const declarations = await Promise.all(
  files
    .filter((file) => file.endsWith(".d.ts"))
    .map(async (file) => ({
      path: file,
      source: await readFile(resolve(distPath, file), "utf8"),
    }))
);
const entrypoints = {
  index: { declarations: publicApiExports, runtime: publicRuntimeExports },
  ...publicSubpathExports,
};
const surfaces = await Promise.all(
  Object.entries(entrypoints).map(async ([name, expected]) => {
    const runtime = await import(
      pathToFileURL(resolve(distPath, `${name}.js`)).href
    );
    return [
      {
        issues: await collectPublicModuleSurfaceIssues(
          declarations,
          `${name}.d.ts`,
          expected.declarations
        ),
        label: `${name} declaration`,
      },
      {
        issues: collectExportNameIssues(Object.keys(runtime), expected.runtime),
        label: `${name} runtime`,
      },
    ];
  })
);

for (const { label, issues } of surfaces.flat()) {
  for (const name of issues.missingSymbols) {
    console.error(`Missing ${label} export: ${name}`);
    process.exitCode = 1;
  }
  for (const name of issues.leakedSymbols) {
    console.error(`Unreviewed ${label} export: ${name}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(
    "Public declarations and runtime surfaces match the reviewed root and subpath APIs."
  );
}
