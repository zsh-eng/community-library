import { hc } from "hono/client";
import type { AppType } from "../../worker/index";

// Shared hono client instance for API calls
export const client = hc<AppType>(import.meta.env.BASE_URL);
