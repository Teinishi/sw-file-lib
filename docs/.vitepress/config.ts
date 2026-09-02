import { defineConfig } from "vitepress";
import { groupIconMdPlugin, groupIconVitePlugin } from "vitepress-plugin-group-icons";
import tableColumnClassesPlugin from "@sw-file-lib/docs-plugins/table-column-classes";
import typedocSidebar from "../api/typedoc-sidebar.json" with { type: "json" };

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "sw-file-lib",
  description: "TypeScript libraries for working with Stormworks files",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Reference", link: "/api/" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Introduction", link: "/guide/" },
          { text: "Read/Write Binary", link: "/guide/read-write-binary" },
          { text: "Read/Write XML", link: "/guide/read-write-xml" },
          { text: "Generating Geometry", link: "/guide/generating-geometry" },
          { text: "Three.js Integration", link: "/guide/threejs-integration" },
          {
            text: "Advanced Usage",
            items: [{ text: "XML Schema", link: "/guide/advanced/xml-schema" }],
          },
        ],
      },
      {
        text: "API",
        items: [{ text: "Index", link: "/api/" }, ...typedocSidebar],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/Teinishi/sw-file-lib" }],
    search: { provider: "local" },
    outline: [2, 3],
  },
  markdown: {
    config(md) {
      md.use(groupIconMdPlugin);
    },
  },
  vite: {
    plugins: [groupIconVitePlugin(), tableColumnClassesPlugin()],
  },
});
