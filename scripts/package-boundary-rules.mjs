import { posix } from "node:path";
import { SyntaxKind } from "typescript/unstable/ast";
import { inspectTypeScriptFiles } from "./typescript-inspection.mjs";

function collectReferences(sourceFile) {
  const specifiers = new Set();
  const appLiterals = new Set();
  const visit = (node) => {
    if (node.moduleSpecifier?.kind === SyntaxKind.StringLiteral) {
      specifiers.add(node.moduleSpecifier.text);
    }
    if (node.kind === SyntaxKind.ImportType && node.argument.literal) {
      specifiers.add(node.argument.literal.text);
    }
    if (node.moduleReference?.expression?.kind === SyntaxKind.StringLiteral) {
      specifiers.add(node.moduleReference.expression.text);
    }
    if (
      (node.kind === SyntaxKind.StringLiteral ||
        node.kind === SyntaxKind.NoSubstitutionTemplateLiteral) &&
      node.text.includes("apps/web")
    ) {
      appLiterals.add(node.text);
    }
    if (
      node.kind === SyntaxKind.CallExpression &&
      node.expression.kind === SyntaxKind.ImportKeyword &&
      (node.arguments[0]?.kind === SyntaxKind.StringLiteral ||
        node.arguments[0]?.kind === SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      specifiers.add(node.arguments[0].text);
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return { appLiterals, specifiers: [...specifiers] };
}

const testFilePattern = /(?:\.test\.tsx?$|-test-helpers\.tsx?$)/;
const javascriptExtensionPattern = /\.js$/;
const providers = new Set(["file", "hls", "youtube"]);

const allowedLayers = {
  adapters: new Set(["adapters", "core"]),
  captions: new Set(["captions"]),
  core: new Set(["core"]),
  preview: new Set(["preview", "react", "core"]),
  react: new Set(["react", "core", "captions", "adapters"]),
  skins: new Set(["skins", "ui", "styles", "core"]),
  ui: new Set(["ui", "react", "core", "adapters"]),
};

const allowedExternalPackages = {
  adapters: new Set(["hls.js"]),
  captions: new Set(["entities/decode"]),
  core: new Set(),
  preview: new Set(["react"]),
  react: new Set(["react"]),
  skins: new Set(),
  ui: new Set(["react", "react-dom"]),
};

const adapterPublicEntries = new Set([
  "src/adapters/index.ts",
  "src/adapters/create-vibe-player-adapter.ts",
]);

function isTestFile(path) {
  return testFilePattern.test(path);
}

function resolveTarget(path, specifier, paths) {
  const base = posix.normalize(posix.join(posix.dirname(path), specifier));
  if (base.endsWith(".css")) {
    return base;
  }
  const sourceBase = base.replace(javascriptExtensionPattern, "");
  return [
    base,
    `${sourceBase}.ts`,
    `${sourceBase}.tsx`,
    `${sourceBase}.d.ts`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ].find((candidate) => paths.has(candidate));
}

function inspectAdapterDependency(path, target) {
  const [, , owner] = path.split("/");
  const [, , dependency] = target.split("/");
  if (adapterPublicEntries.has(path)) {
    return null;
  }
  if (owner === dependency || dependency === "shared") {
    return null;
  }
  if (providers.has(owner) && dependency === "native") {
    return null;
  }
  return `${owner} adapter cannot depend on ${dependency}`;
}

function inspectLayerDependency(path, specifier, paths) {
  const [, owner] = path.split("/");
  if (isTestFile(path) || owner === "index.ts") {
    return null;
  }
  if (!specifier.startsWith(".")) {
    return allowedExternalPackages[owner]?.has(specifier)
      ? null
      : `${owner} cannot import external package ${specifier}`;
  }
  const target = resolveTarget(path, specifier, paths);
  if (!target) {
    return "unresolved package source import";
  }
  const [, dependency] = target.split("/");
  if (!allowedLayers[owner]?.has(dependency)) {
    return `${owner} cannot depend on ${dependency}`;
  }
  if (dependency !== "adapters") {
    return null;
  }
  if (owner === "adapters") {
    return inspectAdapterDependency(path, target);
  }
  return adapterPublicEntries.has(target)
    ? null
    : "use the adapters public entrypoint";
}

function inspectImport(path, specifier, paths) {
  if (specifier.startsWith("@/") || specifier.startsWith("~/")) {
    return { path, reason: "app import alias", specifier };
  }
  if (specifier.includes("apps/web")) {
    return { path, reason: "product app import", specifier };
  }
  if (specifier === "next" || specifier.startsWith("next/")) {
    return { path, reason: "Next.js import", specifier };
  }
  const reason = inspectLayerDependency(path, specifier, paths);
  return reason ? { path, reason, specifier } : null;
}

export function collectPackageBoundaryIssues(files) {
  return inspectTypeScriptFiles(files, async (project, root) => {
    const paths = new Set(files.map((file) => file.path));
    const groups = await Promise.all(
      files.map(async ({ path }) => {
        const sourceFile = await project.program.getSourceFile(
          `${root}/${path}`
        );
        const { specifiers, appLiterals } = collectReferences(sourceFile);
        const imports = specifiers
          .map((specifier) => inspectImport(path, specifier, paths))
          .filter((issue) => issue !== null);
        const literals = [...appLiterals]
          .filter((value) => !specifiers.includes(value))
          .map((specifier) => ({
            path,
            reason: "product app runtime literal",
            specifier,
          }));
        return [...imports, ...literals];
      })
    );
    return groups.flat();
  });
}
