import { skipTrivia } from "typescript/unstable/ast/scanner";
import { SymbolFlags } from "typescript/unstable/async";
import {
  readDeclarationName,
  stripDeclarationComments,
} from "./api-report-format.mjs";
import { inspectTypeScriptFiles } from "./typescript-inspection.mjs";

async function readLocalName(checker, symbol) {
  // biome-ignore lint/suspicious/noBitwiseOperators: SymbolFlags is a compiler bit set; only alias symbols can be resolved further.
  if ((symbol.flags & SymbolFlags.Alias) === 0) {
    return symbol.name;
  }
  const target = await checker.getAliasedSymbol(symbol);
  return target.name;
}

async function collectEntry(project, root, entry) {
  const sourceFile = await project.program.getSourceFile(
    `${root}/${entry.file}`
  );
  const moduleSymbol = sourceFile
    ? await project.checker.getSymbolAtLocation(sourceFile)
    : undefined;
  if (!moduleSymbol) {
    throw new Error(`API report could not load ${entry.file}.`);
  }
  const runtimeNames = new Set(entry.runtimeNames);
  const symbols = await project.checker.getExportsOfModule(moduleSymbol);
  const exports = await Promise.all(
    symbols.map(async (symbol) => ({
      kind: runtimeNames.has(symbol.name) ? "value" : "type",
      localName: await readLocalName(project.checker, symbol),
      name: symbol.name,
    }))
  );
  return { exports, specifier: entry.specifier };
}

async function readStatements(project, root, file) {
  const sourceFile = await project.program.getSourceFile(
    `${root}/${file.path}`
  );
  if (!sourceFile) {
    throw new Error(`API report could not load ${file.path}.`);
  }
  const statements = [];
  for (const statement of sourceFile.statements) {
    const start = skipTrivia(file.source, statement.pos);
    const text = stripDeclarationComments(
      file.source.slice(start, statement.end)
    );
    const name = readDeclarationName(text);
    if (name !== undefined) {
      statements.push({ name, text });
    }
  }
  return statements;
}

function groupDeclarations(statements, publicNames) {
  const groups = new Map();
  for (const { name, text } of statements) {
    const group = groups.get(name) ?? {
      name,
      public: publicNames.has(name),
      texts: [],
    };
    group.texts.push(text);
    groups.set(name, group);
  }
  return [...groups.values()];
}

/**
 * Reads every entry point's compiler-resolved exports and every top-level
 * declaration in the declaration graph, without writing workspace files.
 * @param {{path: string, source: string}[]} files Built declaration files.
 * @param {{file: string, specifier: string, runtimeNames: string[]}[]} entrypoints
 *   Public entry declaration files, their import specifiers and runtime export names.
 */
export function collectApiReport(files, entrypoints) {
  const orderedFiles = [...files].sort((left, right) =>
    left.path < right.path ? -1 : 1
  );
  return inspectTypeScriptFiles(orderedFiles, async (project, root) => {
    const entries = await Promise.all(
      entrypoints.map((entry) => collectEntry(project, root, entry))
    );
    const publicNames = new Set(
      entries.flatMap((entry) => entry.exports.map((item) => item.localName))
    );
    const statements = await Promise.all(
      orderedFiles.map((file) => readStatements(project, root, file))
    );
    return {
      declarations: groupDeclarations(statements.flat(), publicNames),
      entries,
    };
  });
}
