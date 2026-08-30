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
          const middleware = sirv(env.STORMWORKS_ROM_PATH, {
            etag: true,
          });
          server.middlewares.use("/rom", (req, res, _) => middleware(req, res));
        },
      },
    ],
    resolve: {
      conditions: ["development"],
    },
  };
});
