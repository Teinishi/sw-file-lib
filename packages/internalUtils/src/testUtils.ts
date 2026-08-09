import fs from "node:fs/promises";
import path from "node:path";

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
  process.loadEnvFile(".env.test.local");

  const envPath = process.env[envVar];
  if (!envPath) {
    throw new Error(`Environment variable ${envVar} is not defined.`);
  }

  return await searchFiles(path.join(envPath, dirPath), extensions);
}

export async function searchRom(dirPath: string, extensions: string[]) {
  return await searchEnvPath("STORMWORKS_ROM_PATH", dirPath, extensions);
}
