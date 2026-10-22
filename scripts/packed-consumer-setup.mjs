import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runConsumerCommand } from "./packed-consumer-commands.mjs";

async function installedVersion(root, name) {
  const manifest = JSON.parse(
    await readFile(join(root, "node_modules", name, "package.json"), "utf8")
  );
  return manifest.version;
}

export async function createPackedConsumer(root, reactVersion) {
  const directory = await mkdtemp(join(tmpdir(), "vibe-player-consumer-"));
  try {
    await cp(join(root, "test/consumer"), directory, { recursive: true });
    const packOutput = await runConsumerCommand(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", directory],
      root
    );
    const [archive] = JSON.parse(packOutput);
    if (!archive?.filename) {
      throw new Error("npm pack did not return an archive filename.");
    }
    const version = reactVersion ?? (await installedVersion(root, "react"));
    const manifest = {
      dependencies: {
        react: version,
        "react-dom": version,
        "vibe-player": `file:./${archive.filename}`,
      },
      devDependencies: {
        "@types/react": await installedVersion(root, "@types/react"),
        "@types/react-dom": await installedVersion(root, "@types/react-dom"),
      },
      name: "vibe-player-packed-consumer",
      private: true,
      type: "module",
    };
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
