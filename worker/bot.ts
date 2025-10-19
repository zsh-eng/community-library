import { Hono } from "hono";
import { Bot, Context, webhookCallback } from "grammy";

export const botApp = new Hono<{ Bindings: Env }>().post("/", async (c) => {
  const bot = new Bot(c.env.BOT_TOKEN, { botInfo: JSON.parse(c.env.BOT_INFO) });

  bot.command("start", async (ctx: Context) => {
    await ctx.reply("Hello, world!");
  });

  return webhookCallback(bot, "cloudflare-mod")(c.req.raw);
});
