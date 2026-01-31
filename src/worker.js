import { chromium } from "playwright";
import { runChatGPT } from "./brains/chatgpt.js";
import { runDeepSeek } from "./brains/deepseek.js";
import { runGrok } from "./brains/grok.js";
import { getSession } from "./sessionStore.js";

export async function runBrain(prompt, ctx){
  const headless = ctx.headless ?? true;
  const target = (ctx.target || "chatgpt").toLowerCase();
  const pairKey = ctx.pairKey;

  const session = getSession(pairKey);
  if (!session) throw new Error("Not paired. Open the site in Lemur and click 'Pair current site' in the extension.");

  const browser = await chromium.launch({ headless, args: ["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const context = await browser.newContext({ storageState: session.storageState, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try{
    if (target === "chatgpt") return await runChatGPT(page, prompt, ctx);
    if (target === "deepseek") return await runDeepSeek(page, prompt, ctx);
    if (target === "grok") return await runGrok(page, prompt, ctx);
    throw new Error("Unknown target: "+target);
  } finally {
    await context.close().catch(()=>{});
    await browser.close().catch(()=>{});
  }
}
