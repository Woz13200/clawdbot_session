import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function findLlamaServer() {
  const candidates = [
    process.env.LLAMA_SERVER_PATH,
    "/app/bin/llama-server",
    "/app/llama.cpp/bin/llama-server",
    "/app/llama.cpp/build/bin/llama-server",
    "/app/llama-server",
    "./llama-server",
    "./bin/llama-server",
    "/usr/local/bin/llama-server",
    "/usr/bin/llama-server",
  ].filter(Boolean);

  for (const c of candidates) {
    if (exists(c)) return c;
  }
  return null;
}

export function runLocalGGUF(prompt, {
  modelPath = "/app/models/gguf/tinyllama.gguf",
  nPredict = 256,
  temp = 0.7,
} = {}) {
  return new Promise((resolve, reject) => {
    const bin = findLlamaServer();
    if (!bin) {
      return reject(new Error("llama-server not found (set LLAMA_SERVER_PATH or fix build path)"));
    }

    const args = [
      "-m", modelPath,
      "-n", String(nPredict),
      "--temp", String(temp),
      "--host", "127.0.0.1",
      "--port", "8080",
    ];

    // Start server
    const server = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

    let started = false;
    let stderr = "";
    server.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    server.stdout.on("data", (d) => {
      const s = d.toString();
      // heuristique: quand ça log l'écoute, on considère "ready"
      if (!started && (s.includes("listening") || s.includes("HTTP") || s.includes("server"))) {
        started = true;
      }
    });

    const killServer = () => {
      try { server.kill("SIGTERM"); } catch {}
    };

    // Timeout start
    const t = setTimeout(() => {
      killServer();
      reject(new Error("llama-server startup timeout"));
    }, 20000);

    server.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });

    server.on("exit", (code) => {
      if (!started) {
        clearTimeout(t);
        reject(new Error(`llama-server exited early (${code}). stderr:\n${stderr}`));
      }
    });

    // Once server should be up, call it via fetch from node (using native fetch in Node 20)
    const tryCall = async () => {
      try {
        // petit délai pour laisser le serveur se stabiliser
        await new Promise(r => setTimeout(r, 1200));

        const res = await fetch("http://127.0.0.1:8080/completion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            n_predict: nPredict,
            temperature: temp,
            stop: ["</s>"]
          }),
        });

        const txt = await res.text();
        killServer();
        clearTimeout(t);

        // Some builds return JSON, some return raw; try parse
        try {
          const j = JSON.parse(txt);
          const out = j.content || j.completion || j.response || txt;
          resolve(out);
        } catch {
          resolve(txt);
        }
      } catch (e) {
        killServer();
        clearTimeout(t);
        reject(e);
      }
    };

    // try call after short delay regardless of log readiness
    tryCall();
  });
}
