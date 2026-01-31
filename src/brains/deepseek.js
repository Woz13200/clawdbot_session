export async function runDeepSeek(page, prompt, ctx){
  const url = ctx.chatUrl || "https://chat.deepseek.com/";
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const input = page.locator('textarea, [contenteditable="true"], div[role="textbox"]');
  await input.first().waitFor({ timeout: 45000 });
  await input.first().click();
  await input.first().fill("");
  await input.first().type(prompt, { delay: 10 });

  const sendBtn = page.locator('button:has-text("Send"), button[aria-label*="Send"], button:has-text("发送")');
  if (await sendBtn.first().isVisible().catch(()=>false)) await sendBtn.first().click();
  else await page.keyboard.press("Enter");

  const blocks = page.locator('article, .message, .chat-message, .markdown, [data-role="assistant"]');
  await blocks.last().waitFor({ timeout: 90000 });

  let last = "";
  for (let i=0; i<25; i++){
    const t = (await blocks.last().innerText().catch(()=> ""))?.trim() || "";
    if (t && t === last) break;
    last = t;
    await page.waitForTimeout(1200);
  }
  if (!last) throw new Error("No reply captured.");
  return last;
}
