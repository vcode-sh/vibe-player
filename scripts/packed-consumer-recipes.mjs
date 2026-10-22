import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const recipePattern = /```(?:ts|tsx)\r?\n([\s\S]*?)\r?\n```/g;
const declaredSourcePattern = /\b(?:const|let|var)\s+source\b/;
const stageImportPattern = /import\s*\{[^}]*\bVibePlayerStage\b[^}]*\}/s;

function withHostContext(recipe) {
  const context = ["export {};"];
  if (!declaredSourcePattern.test(recipe)) {
    context.push(
      'declare const source: import("vibe-player").VibePlayerSource;'
    );
  }
  context.push(
    'declare const resumeStore: import("vibe-player").VibePlayerResumeStore;'
  );
  context.push(
    'declare const analytics: { track(name: string, event: import("vibe-player").VibePlayerAnalyticsEvent): void };'
  );
  if (recipe.includes("<VibePlayerStage") && !stageImportPattern.test(recipe)) {
    context.push('import { VibePlayerStage } from "vibe-player";');
  }
  return `${context.join("\n")}\n${recipe}\n`;
}

/** Compile the actual shipped snippets, supplying only their documented host inputs. */
export async function writeConsumerRecipes(directory) {
  const packageDirectory = join(directory, "node_modules/vibe-player");
  const outputDirectory = join(directory, "recipes");
  await mkdir(outputDirectory);
  const paths = ["README.md", "docs/usage.md", "docs/integration.md"];
  const sources = await Promise.all(
    paths.map(async (path) => ({
      markdown: await readFile(join(packageDirectory, path), "utf8"),
      path,
    }))
  );
  const recipes = sources.flatMap(({ path, markdown }) =>
    Array.from(markdown.matchAll(recipePattern), ([, recipe], index) => ({
      filename: `${basename(path, ".md").toLowerCase()}-${index + 1}.tsx`,
      source: withHostContext(recipe),
    }))
  );
  const count = recipes.length;
  await Promise.all(
    recipes.map(({ filename, source }) =>
      writeFile(join(outputDirectory, filename), source)
    )
  );
  if (count === 0) {
    throw new Error("The packed documentation contains no TypeScript recipes.");
  }
  return count;
}
