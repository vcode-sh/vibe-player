import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "vite";

const peerDependencyPattern = /^(?:react(?:-dom)?|hls\.js)(?:\/|$)/;

/** Measure a real consumer bundle, including every non-peer dependency. */
export async function bundlePackageConsumer(root, entrypoints) {
  await mkdir(join(root, "build"), { recursive: true });
  const directory = await mkdtemp(join(root, "build", ".size-"));
  const entry = join(directory, "entry.js");
  try {
    await writeFile(
      entry,
      entrypoints
        .map(
          ({ file, names }) =>
            `export { ${names.join(", ")} } from ${JSON.stringify(join(root, file))};`
        )
        .join("\n")
    );
    const result = await build({
      build: {
        minify: true,
        rolldownOptions: {
          external: peerDependencyPattern,
          input: entry,
          preserveEntrySignatures: "strict",
        },
        write: false,
      },
      configFile: false,
      logLevel: "silent",
    });
    const builds = Array.isArray(result) ? result : [result];
    return builds
      .flatMap((output) => output.output)
      .filter((output) => output.type === "chunk")
      .map((output) => ({
        code: output.code,
        fileName: output.fileName,
        imports: output.imports,
        isEntry: output.isEntry,
      }));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

/** Static shared chunks are initial payload; dynamic provider chunks are deferred. */
export function partitionPackageConsumerChunks(chunks) {
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const initialNames = new Set();
  const pending = chunks.filter((chunk) => chunk.isEntry);
  while (pending.length > 0) {
    const chunk = pending.pop();
    if (!chunk || initialNames.has(chunk.fileName)) {
      continue;
    }
    initialNames.add(chunk.fileName);
    for (const fileName of chunk.imports) {
      const dependency = byName.get(fileName);
      if (dependency) {
        pending.push(dependency);
      }
    }
  }
  return {
    deferred: chunks.filter((chunk) => !initialNames.has(chunk.fileName)),
    initial: chunks.filter((chunk) => initialNames.has(chunk.fileName)),
  };
}
