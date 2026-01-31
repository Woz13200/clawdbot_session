import { chromium } from "playwright";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(_exec);

let browser, context, page;

export async function ensure() {
  if (page) return { browser, context, page };

  browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await context.newPage();
  return { browser, context, page };
}

export async function act(cmd) {
  const { page } = await ensure();
  const t = cmd?.type;

  // compat: accepte payload, params, ou direct
  const p = cmd?.payload || cmd?.params || {};

  if (t === "terminal_exec") {
    const shellCmd = p.cmd || cmd?.cmd;
    if (!shellCmd) return { ok: false, error: "missing cmd" };

    try {
      const { stdout, stderr } = await exec(shellCmd, {
        timeout: 60_000,
        maxBuffer: 20 * 1024 * 1024,
      });
      return { ok: true, result: { stdout, stderr, exit_code: 0 } };
    } catch (e) {
      return {
        ok: false,
        error: String(e?.message || e),
        result: {
          stdout: e?.stdout || "",
          stderr: e?.stderr || "",
          exit_code: typeof e?.code === "number" ? e.code : 1,
        },
      };
    }
  }

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
