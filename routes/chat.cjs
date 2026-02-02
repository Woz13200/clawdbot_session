const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();

// Path du binaire llama.cpp (compilé dans Dockerfile)
const LLAMA_CLI = process.env.LLAMA_CLI || "/app/llama.cpp/build/bin/llama-cli";

// Modèle GGUF (téléchargé par start.sh)
const MODEL_PATH =
  process.env.GGUF_MODEL ||
  "/app/models/gguf/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf";

function buildPrompt(userText) {
  // Simple + efficace (TinyLlama)
  return [
    "You are Moltbot, a helpful assistant. Be concise, practical and direct.",
    "User:",
    userText.trim(),
    "Assistant:"
  ].join("\n");
}

router.post("/", async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString();
    if (!prompt.trim()) return res.status(400).json({ error: "Missing prompt" });

    const fullPrompt = buildPrompt(prompt);

    const args = [
      "-m", MODEL_PATH,
      "-p", fullPrompt,
      "-n", String(Number(process.env.MAX_TOKENS || 256)),
      "--temp", String(Number(process.env.TEMP || 0.7)),
      "--top-p", String(Number(process.env.TOP_P || 0.95)),
      "--repeat-penalty", String(Number(process.env.REPEAT_PENALTY || 1.1)),
      "--ctx-size", String(Number(process.env.CTX || 2048))
    ];

    const child = spawn(LLAMA_CLI, args, { stdio: ["ignore", "pipe", "pipe"] });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: "llama-cli failed",
          code,
          details: err.slice(-3000)
        });
      }

      // Nettoyage basique
      const text = out
        .replace(fullPrompt, "")
        .replace(/^Assistant:\s*/i, "")
        .trim();

      return res.json({ text });
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
