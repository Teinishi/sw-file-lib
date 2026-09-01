import { defineConfig } from "vitepress";
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
          { text: "Getting Started", link: "/guide/" },
          { text: "XML Schema", link: "/guide/xml-schema" },
        ],
      },
      {
        text: "API",
        items: [{ text: "Index", link: "/api/" }, ...typedocSidebar],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/Teinishi/sw-file-lib" }],

    search: { provider: "local" },
  },
  vite: {
    plugins: [tableColumnClassesPlugin()],
  },
});
