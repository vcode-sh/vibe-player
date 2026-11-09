import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { runConsumerCommand } from "./packed-consumer-commands.mjs";

async function installedVersion(root, name) {
  const manifest = JSON.parse(
    await readFile(join(root, "node_modules", name, "package.json"), "utf8")
  );
  return manifest.version;
}

/**
 * Where packed consumers are installed: on disk (never a RAM-backed temp
 * directory) and outside the repository, so Node resolution cannot fall
 * back to the repository's own node_modules.
 * @param {string} root Repository root.
 * @param {Record<string, string | undefined>} env Process environment.
 * @returns {string}
 */
export function resolveConsumerBase(root, env) {
  const base = env.RUNNER_TEMP
    ? resolve(env.RUNNER_TEMP)
    : resolve(
        env.XDG_CACHE_HOME || join(env.HOME || homedir(), ".cache"),
        "vibe-player"
      );
  const fromRoot = relative(resolve(root), base);
  const outside =
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot);
  if (!outside) {
    throw new Error(
      `Packed consumers must install outside the repository, not in ${base}.`
    );
  }
  return base;
}

/** Packs the package into `directory` and returns the archive file name. */
async function packArchive(root, directory) {
  const packOutput = await runConsumerCommand(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
    root
  );
  const packed = JSON.parse(packOutput);
  const [archive] = Array.isArray(packed) ? packed : Object.values(packed);
  if (!archive?.filename) {
    throw new Error("npm pack did not return an archive filename.");
  }
  return archive.filename;
}

/** The consumer's package.json: the packed archive plus pinned peers. */
async function createConsumerManifest(root, archiveName, reactVersion) {
  return {
    dependencies: {
      "hls.js": await installedVersion(root, "hls.js"),
      react: reactVersion,
      "react-dom": reactVersion,
      "vibe-player": `file:./${archiveName}`,
    },
    devDependencies: {
      "@tabler/icons-react": "3.50.0",
      "@types/react": await installedVersion(root, "@types/react"),
      "@types/react-dom": await installedVersion(root, "@types/react-dom"),
    },
    name: "vibe-player-packed-consumer",
    private: true,
    type: "module",
  };
}

export async function createPackedConsumer(
  root,
  reactVersion,
  env = process.env
) {
  const base = resolveConsumerBase(root, env);
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, "consumer-"));
  try {
    await cp(join(root, "test/consumer"), directory, { recursive: true });
    const archive = await packArchive(root, directory);
    const version = reactVersion ?? (await installedVersion(root, "react"));
    const manifest = await createConsumerManifest(root, archive, version);
    await writeFile(
      join(directory, "package.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    await runConsumerCommand(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
      ],
      directory
    );
    return { directory, reactVersion: version };
  } catch (error) {
    await rm(directory, { force: true, recursive: true });
    throw new Error(`Packed consumer setup failed in ${directory}.`, {
      cause: error,
    });
  }
}
