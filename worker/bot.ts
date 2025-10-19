import { Hono } from "hono";
import { Bot, Context, webhookCallback } from "grammy";

export const botApp = new Hono<{ Bindings: Env }>().post("/", async (c) => {
  console.log("received a request");
  const bot = new Bot(c.env.BOT_TOKEN, { botInfo: JSON.parse(c.env.BOT_INFO) });
  console.log("bot created", c.env.BOT_INFO, c.env.BOT_TOKEN);

  bot.command("start", async (ctx: Context) => {
    await ctx.reply("Hello, world!");
  });

  return webhookCallback(bot, "cloudflare-mod")(c.req.raw);
});
