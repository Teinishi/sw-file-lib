import path from "node:path";
import ts from "typescript";

export function relativeImportPath(from: string, to: string): string {
  let rel = path.relative(path.dirname(from), to.replace(/\.ts?$/, ""));
  rel = rel.replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}

export function filenameAndLine(node: ts.Node, sourceFile: ts.SourceFile): string {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
  return `${sourceFile.fileName}:${line + 1}`;
}

export class SetMap<K, V> {
  private map: Map<K, Set<V>> = new Map();

  get(key: K): Set<V> | undefined {
    return this.map.get(key);
  }

  add(key: K, value: V): void {
    if (!this.map.has(key)) {
      this.map.set(key, new Set());
    }
    this.map.get(key)!.add(value);
  }

  remove(key: K, value: V): void {
    if (this.map.has(key)) {
      const set = this.map.get(key)!;
      set.delete(value);
      if (set.size === 0) {
        this.map.delete(key);
      }
    }
  }

  has(key: K, value: V): boolean {
    return this.map.has(key) && this.map.get(key)!.has(value);
  }

  entries(): [K, Set<V>][] {
    return Array.from(this.map.entries());
  }
}
