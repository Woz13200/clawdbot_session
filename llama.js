import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MODEL_PATH = process.env.GGUF_PATH || "models/gguf/tinyllama.gguf";
const LLAMA_BIN   = process.env.LLAMA_BIN || "/app/bin/llama-server";
const LLAMA_HOST  = process.env.LLAMA_HOST || "127.0.0.1";
const LLAMA_PORT  = Number(process.env.LLAMA_PORT || 8080);

let child = null;
let ready = false;
let bootError = null;
let booting = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pingServer() {
  // llama.cpp server répond souvent sur /health, sinon on teste /v1/models
  const base = `http://${LLAMA_HOST}:${LLAMA_PORT}`;
  try {
    const r1 = await fetch(`${base}/health`, { method: "GET" });
    if (r1.ok) return true;
  } catch (_) {}

  try {
    const r2 = await fetch(`${base}/v1/models`, { method: "GET" });
    if (r2.ok) return true;
  } catch (_) {}

  return false;
}

async function waitReady(timeoutMs = 180000) { // 3 min max
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await pingServer()) return true;
    await sleep(800);
  }
  return false;
}

function ensureModelFile() {
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`GGUF not found at: ${MODEL_PATH}`);
  }
}

function spawnServer() {
  // Important: on force host+port pour être sûr, et on garde un contexte raisonnable
  const args = [
    "-m", MODEL_PATH,
    "--host", LLAMA_HOST,
    "--port", String(LLAMA_PORT),
    "-c", String(process.env.CTX || 2048),
    "-n", String(process.env.MAX_TOKENS || 256),
    "--temp", String(process.env.TEMP || 0.7),
  ];

  child = spawn(LLAMA_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (d) => process.stdout.write(`[llama] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[llama] ${d}`));

  child.on("exit", (code, sig) => {
    ready = false;
    booting = false;
    bootError = new Error(`llama-server exited code=${code} sig=${sig}`);
    child = null;
    console.error("[BOOT] llama-server exited:", bootError.message);
  });

  child.on("error", (err) => {
    ready = false;
    booting = false;
    bootError = err;
    child = null;
    console.error("[BOOT] spawn error:", err.message);
  });
}

export async function boot() {
  if (ready) return;
  if (booting) return;
  booting = true;
  bootError = null;

  try {
    ensureModelFile();
    console.log("[BOOT] starting llama-server...");
    spawnServer();

    const ok = await waitReady();
    if (!ok) {
      throw new Error("llama-server did not become ready in time");
    }

    ready = true;
    console.log("[BOOT] llama-server ready ✅");
  } catch (e) {
    ready = false;
    bootError = e;
    console.error("[BOOT] failed:", e.message);
  } finally {
    booting = false;
  }
}

export function status() {
  return {
    ready,
    booting,
    model: MODEL_PATH,
    llama: { bin: LLAMA_BIN, host: LLAMA_HOST, port: LLAMA_PORT },
    error: bootError ? String(bootError.message || bootError) : null
  };
}

export async function chat(message) {
  // ✅ si pas prêt, on renvoie une ERREUR CLAIRE (pas une string dans reply)
  if (!ready) {
    const s = status();
    const err = new Error(s.error || "Loading model");
    err.code = 503;
    err.type = "unavailable_error";
    throw err;
  }

  const url = `http://${LLAMA_HOST}:${LLAMA_PORT}/v1/chat/completions`;

  const payload = {
    model: "gguf-local",
    messages: [
      { role: "system", content: "Tu es Moltbot. Réponds clairement, utilement, en français." },
      { role: "user", content: message }
    ],
    temperature: Number(process.env.TEMP || 0.7),
    max_tokens: Number(process.env.MAX_TOKENS || 256)
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const e = new Error(`llama-server error ${r.status}: ${txt.slice(0, 200)}`);
    e.code = 502;
    e.type = "upstream_error";
    throw e;
  }

  const data = await r.json();
  const reply = data?.choices?.[0]?.message?.content?.trim() || "";
  return reply || "⚠️ Réponse vide (upstream OK mais content vide)";
}
