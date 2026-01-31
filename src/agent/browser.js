import { chromium } from "playwright";

let browser, context, page;

export async function ensure() {
  if (page) return { browser, context, page };

  browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await context.newPage();
  return { browser, context, page };
}

export async function act(cmd) {
  const { page } = await ensure();
  const t = cmd?.type;
  const p = cmd?.payload || {};

  if (t === "goto") {
    await page.goto(p.url, { waitUntil: "domcontentloaded" });
    return { ok: true };
  }
  if (t === "click") {
    await page.click(p.selector, { timeout: 15000 });
    return { ok: true };
  }
  if (t === "type") {
    await page.fill(p.selector, p.text ?? "");
    return { ok: true };
  }
  if (t === "press") {
    await page.keyboard.press(p.key);
    return { ok: true };
  }
  if (t === "wait") {
    await page.waitForTimeout(Number(p.ms ?? 500));
    return { ok: true };
  }
  if (t === "screenshot") {
    const buf = await page.screenshot({ type: "png" });
    return { ok: true, imageBase64: buf.toString("base64") };
  }

  return { ok: false, error: "unknown action type" };
}
