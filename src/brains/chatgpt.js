export async function runChatGPT(page, prompt, ctx){
  const url = ctx.chatUrl || "https://chatgpt.com/";
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const input = page.locator('textarea, [contenteditable="true"][role="textbox"], div[role="textbox"]');
  await input.first().waitFor({ timeout: 45000 });
  await input.first().click();
  await input.first().fill("");
  await input.first().type(prompt, { delay: 10 });
  await page.keyboard.press("Enter");

  const assistant = page.locator('[data-message-author-role="assistant"]');
  await assistant.last().waitFor({ timeout: 90000 });

  let last = "";
  for (let i=0; i<25; i++){
    const t = (await assistant.last().innerText().catch(()=> ""))?.trim() || "";
    if (t && t === last) break;
    last = t;
    await page.waitForTimeout(1200);
  }
  if (!last) throw new Error("No assistant text captured (session/login issue?).");
  return last;
}
