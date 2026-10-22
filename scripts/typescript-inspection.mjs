import { API } from "typescript/unstable/async";
import { createVirtualFileSystem } from "typescript/unstable/fs";

const inspectionRoot = "/__vibe_player_inspection__";

/** Uses the installed TypeScript parser without creating workspace files. */
export async function inspectTypeScriptFiles(files, inspect) {
  const configPath = `${inspectionRoot}/tsconfig.json`;
  const virtualFiles = Object.fromEntries(
    files.map(({ path, source }) => [`${inspectionRoot}/${path}`, source])
  );
  virtualFiles[configPath] = JSON.stringify({
    compilerOptions: {
      jsx: "react-jsx",
      module: "esnext",
      moduleResolution: "bundler",
      noLib: true,
      target: "es2022",
      types: [],
    },
    files: files.map(({ path }) => `./${path}`),
  });
  const api = new API({
    cwd: inspectionRoot,
    fs: createVirtualFileSystem(virtualFiles),
  });
  try {
    const snapshot = await api.updateSnapshot({ openProjects: [configPath] });
    const project = await snapshot.getProject(configPath);
    if (!project) {
      throw new Error("TypeScript inspection project could not be loaded.");
    }
    return await inspect(project, inspectionRoot);
  } finally {
    await api.close();
  }
}
