import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runConsumerCommand } from "./packed-consumer-commands.mjs";
import { writeConsumerRecipes } from "./packed-consumer-recipes.mjs";
import { createPackedConsumer } from "./packed-consumer-setup.mjs";

const root = resolve(import.meta.dirname, "..");
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

function readOptions(args) {
  let reactVersion;
  let skipBuild = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--skip-build") {
      skipBuild = true;
    } else if (argument === "--react-version") {
      reactVersion = args[index + 1];
      if (!(reactVersion && exactVersionPattern.test(reactVersion))) {
        throw new Error("--react-version requires an exact version.");
      }
      index += 1;
    } else {
      throw new Error(`Unknown consumer-check argument: ${argument}`);
    }
  }
  return { reactVersion, skipBuild };
}

async function verifyConsumer(directory, skipBuild) {
  const recipeCount = await writeConsumerRecipes(directory);
  await runConsumerCommand(
    process.execPath,
    [
      resolve(root, "node_modules/typescript/bin/tsc"),
      "--project",
      "tsconfig.json",
    ],
    directory
  );
  process.stdout.write(
    await runConsumerCommand(process.execPath, ["runtime.mjs"], directory)
  );
  if (!skipBuild) {
    const { build } = await import("vite");
    await build({
      build: { emptyOutDir: true, outDir: "build" },
      configFile: false,
      logLevel: "warn",
      root: directory,
    });
  }
  return recipeCount;
}

let consumerDirectory;
try {
  const options = readOptions(process.argv.slice(2));
  await access(resolve(root, "dist/index.js"));
  const consumer = await createPackedConsumer(root, options.reactVersion);
  consumerDirectory = consumer.directory;
  const recipeCount = await verifyConsumer(
    consumerDirectory,
    options.skipBuild
  );
  console.log(
    `Packed consumer passed on Node ${process.versions.node}, React ${consumer.reactVersion}: ${recipeCount} shipped recipes${options.skipBuild ? "; build intentionally skipped for runtime compatibility" : ", consumer build"}.`
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (consumerDirectory) {
    await rm(consumerDirectory, { force: true, recursive: true });
  }
}
