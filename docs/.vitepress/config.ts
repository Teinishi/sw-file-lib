import { defineConfig } from "vitepress";
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
          { text: "Markdown Examples", link: "/guide/markdown-examples" },
          { text: "Runtime API Examples", link: "/guide/api-examples" },
          { text: "XML Schema", link: "/guide/xml-schema" },
        ],
      },
      {
        text: "API",
        items: [{ text: "Index", link: "/api/" }, ...typedocSidebar],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/Teinishi/sw-file-lib" }],
  },
});
