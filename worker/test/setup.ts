import { applyD1Migrations, env } from "cloudflare:test";
import { vi } from "vitest";

vi.mock("@grammyjs/commands", () => ({
  CommandGroup: class {
    command() {
      return this;
    }
  },
}));
vi.mock("../lib/admin", () => ({
  isUserAdmin: vi.fn().mockResolvedValue(true),
}));

await applyD1Migrations(env.DATABASE, env.TEST_MIGRATIONS);
