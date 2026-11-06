import { expect, it } from "vitest";
import { partitionPackageConsumerChunks } from "./package-consumer-size.mjs";

it("includes transitive static imports while reporting dynamic provider chunks separately", () => {
  const chunks = [
    { fileName: "entry.js", imports: ["shared.js", "react"], isEntry: true },
    { fileName: "shared.js", imports: ["state.js"], isEntry: false },
    { fileName: "state.js", imports: ["shared.js"], isEntry: false },
    { fileName: "hls-adapter.js", imports: ["state.js"], isEntry: false },
  ];

  const { initial, deferred } = partitionPackageConsumerChunks(chunks);

  expect(initial.map((chunk) => chunk.fileName)).toEqual([
    "entry.js",
    "shared.js",
    "state.js",
  ]);
  expect(deferred.map((chunk) => chunk.fileName)).toEqual(["hls-adapter.js"]);
});
