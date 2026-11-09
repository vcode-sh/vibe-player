import { access, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runConsumerCommand } from "./packed-consumer-commands.mjs";
import {
  createPackedConsumer,
  resolveConsumerBase,
} from "./packed-consumer-setup.mjs";

const root = resolve(import.meta.dirname, "..");
/** The developer default: the user cache, outside the repository. */
const cacheEnv = { HOME: homedir() };

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

  const consumer = await createPackedConsumer(root, "19.2.7", cacheEnv);
  consumerDirectory = consumer.directory;
  expect(
    consumer.directory.startsWith(
      join(homedir(), ".cache/vibe-player/consumer-")
    )
  ).toBe(true);
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
      createPackedConsumer(root, "19.2.7", cacheEnv)
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

describe("resolveConsumerBase", () => {
  it("prefers the CI runner's temporary directory", () => {
    expect(
      resolveConsumerBase("/work/repo", {
        HOME: "/home/dev",
        RUNNER_TEMP: "/runner/_temp",
        XDG_CACHE_HOME: "/cache",
      })
    ).toBe("/runner/_temp");
  });

  it.each([
    [{ HOME: "/home/dev", XDG_CACHE_HOME: "/cache" }, "/cache/vibe-player"],
    [{ HOME: "/home/dev" }, "/home/dev/.cache/vibe-player"],
    [{ HOME: "/home/dev", XDG_CACHE_HOME: "" }, "/home/dev/.cache/vibe-player"],
  ])("falls back to the user cache for %o", (env, expected) => {
    expect(resolveConsumerBase("/work/repo", env)).toBe(expected);
  });

  it.each([
    ["the repository", "/work/repo"],
    ["a folder inside it", "/work/repo/build"],
  ])("refuses %s, where node_modules would resolve", (_case, location) => {
    expect(() =>
      resolveConsumerBase("/work/repo", { RUNNER_TEMP: location })
    ).toThrow("outside the repository");
  });

  it("accepts a sibling whose name starts like the repository", () => {
    expect(
      resolveConsumerBase("/work/repo", { RUNNER_TEMP: "/work/repo-temp" })
    ).toBe("/work/repo-temp");
  });
});
