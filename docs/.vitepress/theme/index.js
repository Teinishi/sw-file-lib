import DefaultTheme from "vitepress/theme";
import "virtual:group-icons.css";
import "./custom.css";

const modules = import.meta.glob("../components/*.vue", {
  eager: true,
  import: "default",
});

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    for (const [path, component] of Object.entries(modules)) {
      const name = path.split("/").pop()?.replace(".vue", "");
      if (name) {
        app.component(name, component);
      }
    }
  },
};
