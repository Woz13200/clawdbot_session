const express = require("express");
const router = express.Router();

const LLAMA_PORT = process.env.LLAMA_PORT || "8081";
const LLAMA_URL = `http://127.0.0.1:${LLAMA_PORT}/completion`;

router.post("/", async (req, res) => {
  try {
    const userInput = req.body?.message || "";

    const prompt = `
Tu es CLAWDBOT, un agent autonome.
Réponds clairement et en français.

Utilisateur :
${userInput}

Réponse :
`.trim();

    const payload = {
      prompt,
      n_predict: 256,
      temperature: 0.7,
      stop: ["</s>"]
    };

    const r = await fetch(LLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({
        agent: "clawdbot",
        status: "error",
        error: "llama-server error",
        detail: t
      });
    }

    const data = await r.json();

    const text =
      data?.content ||
      data?.completion ||
      "";

    // 🔒 ICI on GARANTIT le JSON pour l’UI
    return res.json({
      agent: "clawdbot",
      status: "ok",
      output: text.trim(),
      actions: []
    });

  } catch (err) {
    return res.status(500).json({
      agent: "clawdbot",
      status: "error",
      error: err.message
    });
  }
});

module.exports = router;
