import type { Plugin } from "vite";
import { addTableColumnClasses } from "./addTableColumnClasses";

export default function tableColumnClassesPlugin(): Plugin {
  return {
    name: "table-column-classes",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/api/") || !id.endsWith(".md")) return;
      return addTableColumnClasses(code);
    },
  };
}
