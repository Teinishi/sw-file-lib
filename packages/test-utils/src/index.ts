import type { PathLike } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

async function fileExists(filePath: PathLike) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** cwd がどこだかわからないのでルートを探索 (pnpm-workspace.yaml が存在するディレクトリを探す) */
export async function findWorkspaceRoot(): Promise<string> {
  let dir = process.cwd();

  while (true) {
    const workspacePath = path.join(dir, "pnpm-workspace.yaml");

    if (await fileExists(workspacePath)) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find workspace root");
    }

    dir = parent;
  }
}

export async function loadWorkspaceEnv(filename: string) {
  const root = await findWorkspaceRoot();
  const envPath = path.join(root, filename);
  process.loadEnvFile(envPath);
}

async function searchFiles(dirPath: string, extensions: string[]) {
  const allDirents = await fs.readdir(dirPath, { withFileTypes: true });

  const files: string[] = [];
  for (const dirent of allDirents) {
    if (dirent.isDirectory()) {
      const fp = path.join(dirPath, dirent.name);
      files.push(...(await searchFiles(fp, extensions)));
    } else if (dirent.isFile() && extensions.includes(path.extname(dirent.name))) {
      files.push(path.join(dirPath, dirent.name));
    }
  }
  return files.flat();
}

export async function searchEnvPath(envVar: string, dirPath: string, extensions: string[]) {
  await loadWorkspaceEnv(".env.local");

  const envPath = process.env[envVar];
  if (!envPath) {
    throw new Error(`Environment variable ${envVar} is not defined.`);
  }

  return await searchFiles(path.join(envPath, dirPath), extensions);
}

export async function searchRom(dirPath: string, extensions: string[]) {
  return await searchEnvPath("STORMWORKS_ROM_PATH", dirPath, extensions);
}
