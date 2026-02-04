import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "drizzle");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      pool: "@cloudflare/vitest-pool-workers" as const,
      globals: true,
      include: ["worker/test/**/*.test.ts"],
      setupFiles: ["worker/test/setup.ts"],
      testTimeout: 20_000,
      poolOptions: {
        workers: {
          main: "worker/index.ts",
          isolatedStorage: true,
          singleWorker: true,
          wrangler: {
            configPath: "./wrangler.jsonc",
          },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              BOT_TOKEN: "test-bot-token",
              ADMIN_GROUP_ID: "-1001234567890",
              BOT_INFO: "{}",
              MINIAPP_URL: "",
            },
            assets: {
              directory: "./public",
            },
          },
        },
      },
    },
  };
});
