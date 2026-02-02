import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const WEB_PORT = Number(process.env.PORT || 10000);

// IMPORTANT: llama-server sur un port DIFFERENT du web
const LLAMA_PORT = Number(process.env.LLAMA_PORT || (WEB_PORT + 1));
const LLAMA_HOST = process.env.LLAMA_HOST || "127.0.0.1";

// Modèle
const MODEL_DIR = process.env.MODEL_DIR || path.join(process.cwd(), "models", "gguf");
const MODEL_FILE = process.env.MODEL_FILE || "tinyllama.gguf";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_FILE);

// URL du modèle (tu peux la changer)
const MODEL_URL = process.env.MODEL_URL ||
  "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf";

// Réglages safe RAM (Render free = fragile)
const N_CTX = Number(process.env.N_CTX || 1024);
const N_BATCH = Number(process.env.N_BATCH || 128);
const N_PREDICT = Number(process.env.N_PREDICT || 256);
const TEMP = Number(process.env.TEMP || 0.7);

let booting = false;
let ready = false;
let lastError = null;
let child = null;

function findLlamaServerBinary() {
  // Plusieurs chemins possibles selon ton Dockerfile/build
  const candidates = [
    "/app/bin/llama-server",
    "/app/llama.cpp/build/bin/llama-server",
    path.join(process.cwd(), "bin", "llama-server"),
    path.join(process.cwd(), "llama.cpp", "build", "bin", "llama-server")
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpJson(url, bodyObj) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(bodyObj)
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function ensureModel() {
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  if (fs.existsSync(MODEL_PATH) && fs.statSync(MODEL_PATH).size > 50 * 1024 * 1024) {
    return { ok: true, modelPath: MODEL_PATH };
  }

  console.log("[BOOT] Downloading model...");
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);

  const tmp = MODEL_PATH + ".tmp";
  const file = fs.createWriteStream(tmp);

  await new Promise((resolve, reject) => {
    res.body.on("error", reject);
    file.on("error", reject);
    file.on("finish", resolve);
    res.body.pipe(file);
  });

  fs.renameSync(tmp, MODEL_PATH);
  console.log("[BOOT] Model ready:", MODEL_PATH);
  return { ok: true, modelPath: MODEL_PATH };
}

async function waitServerReady(timeoutMs = 120000) {
  const start = Date.now();
  const url = `http://${LLAMA_HOST}:${LLAMA_PORT}/health`;

  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

function startServer() {
  const bin = findLlamaServerBinary();
  if (!bin) {
    throw new Error("llama-server introuvable (ENOENT). Vérifie le chemin /app/bin/llama-server ou ton build.");
  }

  const args = [
    "-m", MODEL_PATH,
    "--host", LLAMA_HOST,
    "--port", String(LLAMA_PORT),
    "-c", String(N_CTX),
    "-b", String(N_BATCH),
    "--temp", String(TEMP)
  ];

  console.log("[BOOT] starting llama-server:", bin, args.join(" "));
  child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (d) => process.stdout.write(`[llama] ${d}`));
  child.stderr.on("data", (d) => {
    // évite le spam vide infini
    const s = String(d || "").trimEnd();
    if (s.length) process.stderr.write(`[llama stderr] ${s}\n`);
  });

  child.on("exit", (code, signal) => {
    ready = false;
    lastError = `llama-server exit code=${code} signal=${signal}`;
    console.error("[BOOT] llama-server stopped:", lastError);
    child = null;
  });

  child.on("error", (e) => {
    ready = false;
    lastError = String(e?.message || e);
    console.error("[BOOT] llama-server spawn error:", lastError);
    child = null;
  });
}

// ✅ exports NOMMÉS (corrige ton erreur “does not provide export named boot”)
export async function boot() {
  if (ready) return await status();
  if (booting) return await status();

  booting = true;
  lastError = null;

  try {
    await ensureModel();

    // Si déjà lancé, on n'en relance pas 15
    if (!child) startServer();

    const ok = await waitServerReady();
    if (!ok) {
      ready = false;
      lastError = "llama-server not ready (timeout). Probable RAM ou port.";
      return await status();
    }

    ready = true;
    console.log("[BOOT] llama-server READY");
    return await status();
  } catch (e) {
    ready = false;
    lastError = String(e?.message || e);
    console.error("[BOOT] boot error:", lastError);
    return await status();
  } finally {
    booting = false;
  }
}

export async function status() {
  return {
    ready,
    booting,
    webPort: WEB_PORT,
    llamaPort: LLAMA_PORT,
    modelPath: MODEL_PATH,
    ctx: N_CTX,
    batch: N_BATCH,
    lastError
  };
}

export async function chat(prompt) {
  // Si pas ready => 503 côté API
  if (!ready) {
    const e = new Error("Loading model");
    e.status = 503;
    throw e;
  }

  // llama.cpp server API: /completion
  const url = `http://${LLAMA_HOST}:${LLAMA_PORT}/completion`;
  const data = await httpJson(url, {
    prompt,
    n_predict: N_PREDICT,
    temperature: TEMP,
    stop: ["</s>"]
  });

  // formats possibles
  const text = data?.content || data?.completion || data?.response || data?.raw || "";
  return String(text).trim();
}
