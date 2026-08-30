import vue from "@vitejs/plugin-vue";
import sirv from "sirv";
import { defineConfig, loadEnv, type ViteDevServer } from "vite";
import { findWorkspaceRoot } from "@sw-file-lib/test-utils";

export default defineConfig(async ({ mode }) => {
  const workspaceRoot = await findWorkspaceRoot();
  const env = loadEnv(mode, workspaceRoot, "");

  return {
    plugins: [
      vue(),
      {
        name: "serve-rom",
        configureServer(server: ViteDevServer) {
          server.middlewares.use(
            "/rom",
            sirv(env.STORMWORKS_ROM_PATH, {
              dev: true,
              etag: true,
            }),
          );
        },
      },
    ],
    resolve: {
      conditions: ["development"],
    },
  };
});
