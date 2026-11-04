import { access, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runConsumerCommand } from "./packed-consumer-commands.mjs";
import { createPackedConsumer } from "./packed-consumer-setup.mjs";

vi.mock("./packed-consumer-commands.mjs", () => ({
  runConsumerCommand: vi.fn(),
}));

let consumerDirectory;

afterEach(async () => {
  vi.resetAllMocks();
  if (consumerDirectory) {
    await rm(consumerDirectory, { force: true, recursive: true });
    consumerDirectory = undefined;
  }
});

it.each([
  ["npm 11", [{ filename: "vibe-player-0.2.0.tgz" }]],
  ["npm 12", { "vibe-player": { filename: "vibe-player-0.2.0.tgz" } }],
])("installs the packed archive reported by %s", async (_version, output) => {
  vi.mocked(runConsumerCommand)
    .mockResolvedValueOnce(JSON.stringify(output))
    .mockResolvedValueOnce("");

  const consumer = await createPackedConsumer(
    resolve(import.meta.dirname, ".."),
    "19.2.7"
  );
  consumerDirectory = consumer.directory;
  const manifest = JSON.parse(
    await readFile(resolve(consumer.directory, "package.json"), "utf8")
  );

  expect(manifest.dependencies["vibe-player"]).toBe(
    "file:./vibe-player-0.2.0.tgz"
  );
  expect(manifest.dependencies.react).toBe("19.2.7");
  expect(manifest.dependencies["react-dom"]).toBe("19.2.7");
  expect(vi.mocked(runConsumerCommand).mock.calls).toEqual([
    [
      "npm",
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        consumer.directory,
      ],
      resolve(import.meta.dirname, ".."),
    ],
    [
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
      ],
      consumer.directory,
    ],
  ]);
});

it.each(["pack", "install"])(
  "removes its temporary consumer when npm %s fails",
  async (failedCommand) => {
    const failure = new Error(`npm ${failedCommand} failed`);
    vi.mocked(runConsumerCommand).mockImplementation((_command, args, cwd) => {
      if (args[0] === "pack") {
        consumerDirectory = args.at(-1);
      } else {
        expect(cwd).toBe(consumerDirectory);
      }
      if (args[0] === failedCommand) {
        return Promise.reject(failure);
      }
      return Promise.resolve(
        JSON.stringify([{ filename: "vibe-player-0.2.0.tgz" }])
      );
    });

    await expect(
      createPackedConsumer(resolve(import.meta.dirname, ".."), "19.2.7")
    ).rejects.toMatchObject({ cause: failure });
    expect(consumerDirectory).toBeDefined();
    await expect(access(consumerDirectory)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(runConsumerCommand).toHaveBeenCalledTimes(
      failedCommand === "pack" ? 1 : 2
    );
  }
);
