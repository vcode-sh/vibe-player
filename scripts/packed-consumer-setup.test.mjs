import { readFile, rm } from "node:fs/promises";
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
});
