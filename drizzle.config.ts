import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./worker/db/schema.ts",
  dialect: "sqlite",
  // driver: "d1-http",
  // dbCredentials: {
  //   accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  //   databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
  //   token: process.env.CLOUDFLARE_D1_TOKEN!,
  // },
  dbCredentials: {
    url: "/Users/admin/community-library/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d90b39c86548816b45a23e3a272566e4f13667a7ed1cd261c53cceb768cdda3e.sqlite",
  },
});
