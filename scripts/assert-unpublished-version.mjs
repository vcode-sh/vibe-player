import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readNpmVersionState } from "./npm-version-check.mjs";

const { name, version } = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../package.json"), "utf8")
);
const result = await readNpmVersionState(name, version);

if (result.state === "unpublished") {
  console.log(`${name}@${version} is not on npm yet.`);
} else if (result.state === "published") {
  console.error(
    `${name}@${version} is already on npm. Bump the version before releasing; a re-publish would tag a commit npm never received.`
  );
  process.exitCode = 1;
} else {
  console.error(
    `Could not check npm for ${name}@${version} (${result.detail}). Retry the release once the registry answers.`
  );
  process.exitCode = 1;
}
