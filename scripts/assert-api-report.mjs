import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { collectApiReport } from "./api-report-collect.mjs";
import {
  findFirstReportDifference,
  formatApiReport,
} from "./api-report-format.mjs";
import { publicSubpathExports } from "./public-subpath-exports.mjs";

const rootPath = resolve(import.meta.dirname, "..");
const distPath = resolve(rootPath, "dist");
const reportPath = resolve(rootPath, "api/vibe-player.api.md");
const entryNames = ["index", ...Object.keys(publicSubpathExports)];
const update = process.argv.includes("--update");

async function readDeclarationFiles() {
  const files = await readdir(distPath, { recursive: true });
  return Promise.all(
    files
      .filter((file) => file.endsWith(".d.ts"))
      .map(async (file) => ({
        path: file.split(sep).join("/"),
        source: await readFile(resolve(distPath, file), "utf8"),
      }))
  );
}

function readEntrypoints() {
  return Promise.all(
    entryNames.map(async (name) => {
      const runtime = await import(
        pathToFileURL(resolve(distPath, `${name}.js`)).href
      );
      return {
        file: `${name}.d.ts`,
        runtimeNames: Object.keys(runtime),
        specifier: name === "index" ? "vibe-player" : `vibe-player/${name}`,
      };
    })
  );
}

async function readCommittedReport() {
  try {
    return await readFile(reportPath, "utf8");
  } catch {
    return "";
  }
}

const report = formatApiReport(
  await collectApiReport(await readDeclarationFiles(), await readEntrypoints())
);

if (update) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report);
  console.log("Updated api/vibe-player.api.md from the built declarations.");
} else {
  const difference = findFirstReportDifference(
    await readCommittedReport(),
    report
  );
  if (difference) {
    console.error(
      "API report is out of date: the built declarations differ from api/vibe-player.api.md."
    );
    console.error(`First difference at line ${difference.line}:`);
    console.error(`- committed: ${difference.expected}`);
    console.error(`+ built:     ${difference.actual}`);
    console.error(
      "Review the API change, then run `bun run package:api:update` and commit the report."
    );
    process.exitCode = 1;
  } else {
    console.log("API report matches the built declarations.");
  }
}
