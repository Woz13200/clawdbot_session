import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";

const app = express();
app.use(express.json());

/* =========================
   CONFIG
========================= */

const MODEL_PATH = process.env.GGUF_PATH || "models/gguf/tinyllama.gguf";
const LLAMA_PORT = 8080;
const API_PORT = process.env.PORT || 10000;

const POSSIBLE_LLAMA_BINS = [
  "/app/bin/llama-server",
  "/app/build/bin/llama-server",
  "/app/llama.cpp/build/bin/llama-server",
  "/app/llama-server"
];

let llamaProcess = null;
let llamaReady = false;

/* =========================
   UTILS
========================= */

function findLlamaBin() {
  for (const p of POSSIBLE_LLAMA_BINS) {
    if (fs.existsSync(p)) {
      console.log("✅ llama-server trouvé :", p);
      return p;
    }
  }
  throw new Error("❌ llama-server introuvable (chemin invalide)");
}

function startLlama() {
  if (llamaProcess) return;

  const llamaBin = findLlamaBin();

  console.log("🚀 Démarrage llama-server...");
  llamaProcess = spawn(llamaBin, [
    "-m", MODEL_PATH,
    "--port", LLAMA_PORT.toString(),
    "--host", "127.0.0.1",
    "--n-predict", "256",
    "--temp", "0.7"
  ]);

  llamaProcess.stdout.on("data", (d) => {
    const out = d.toString();
    console.log(out);
    if (out.toLowerCase().includes("listening")) {
      llamaReady = true;
      console.log("✅ llama-server prêt");
    }
  });

  llamaProcess.stderr.on("data", (d) => {
    console.error("llama stderr:", d.toString());
  });

  llamaProcess.on("exit", (code) => {
    console.error("❌ llama-server arrêté (code", code, ")");
    llamaProcess = null;
    llamaReady = false;
  });
}

/* =========================
   API
========================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    modelReady: llamaReady
  });
});

app.post("/api/chat", async (req, res) => {
  if (!llamaReady) {
    return res.status(503).json({
      error: {
        message: "Loading model",
        type: "unavailable_error",
        code: 503
      }
    });
  }

  const prompt = req.body?.message;
  if (!prompt) {
    return res.status(400).json({
      error: { message: "Missing message" }
    });
  }

  try {
    const r = await fetch(`http://127.0.0.1:${LLAMA_PORT}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        n_predict: 256,
        temperature: 0.7
      })
    });

    const data = await r.json();
    res.json({
      ok: true,
      reply: data.content || data.response || ""
    });
  } catch (e) {
    res.status(500).json({
      error: { message: "llama-server unreachable" }
    });
  }
});

/* =========================
   BOOT
========================= */

startLlama();

app.listen(API_PORT, () => {
  console.log(`✅ API Moltbot en écoute sur ${API_PORT}`);
});
