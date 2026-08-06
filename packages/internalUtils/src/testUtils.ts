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

export async function searchRom(dirPath: string, extensions: string[]) {
  process.loadEnvFile(".env.test.local");

  const rom_path = process.env.STORMWORKS_ROM_PATH;

  if (!rom_path) {
    throw new Error("The environment variable STORMWORKS_ROM_PATH is not defined");
  }

  return await searchFiles(path.join(rom_path, dirPath), extensions);
}
