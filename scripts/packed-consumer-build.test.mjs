import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createConsumerBuildConfig,
  isPackageDirectiveLog,
} from "./packed-consumer-build.mjs";

const directory = "/cache/vibe-player/consumer-abc";
const packageFile = join(directory, "node_modules/vibe-player/dist/index.js");

describe("packed consumer build logs", () => {
  it("drops the package's own directive warning", () => {
    expect(
      isPackageDirectiveLog(
        { code: "MODULE_LEVEL_DIRECTIVE", id: packageFile },
        directory
      )
    ).toBe(true);
  });

  it.each([
    [
      "a directive in another package",
      {
        code: "MODULE_LEVEL_DIRECTIVE",
        id: join(directory, "node_modules/other/index.js"),
      },
    ],
    [
      "a package whose name starts the same",
      {
        code: "MODULE_LEVEL_DIRECTIVE",
        id: join(directory, "node_modules/vibe-player-extra/index.js"),
      },
    ],
    [
      "a directive in the consumer's own code",
      { code: "MODULE_LEVEL_DIRECTIVE", id: join(directory, "main.tsx") },
    ],
    ["another warning from the package", { code: "EVAL", id: packageFile }],
    ["a warning without a file", { code: "MODULE_LEVEL_DIRECTIVE" }],
  ])("keeps %s", (_case, log) => {
    expect(isPackageDirectiveLog(log, directory)).toBe(false);
  });

  it("forwards every other log to the default handler", () => {
    const { onLog } =
      createConsumerBuildConfig(directory).build.rolldownOptions;
    const handled = [];
    const handler = (level, log) => handled.push([level, log.code]);

    onLog("warn", { code: "MODULE_LEVEL_DIRECTIVE", id: packageFile }, handler);
    onLog("warn", { code: "EVAL", id: packageFile }, handler);

    expect(handled).toEqual([["warn", "EVAL"]]);
  });
});
