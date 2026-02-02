const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODEL_PATH = path.join(__dirname, "models", "gguf", "tinyllama.gguf");

// chemins possibles selon build
const CANDIDATES = [
  path.join(__dirname, "bin", "llama-server"),
  "/app/bin/llama-server",
  path.join(__dirname, "llama.cpp", "build", "bin", "llama-server"),
  "/app/llama.cpp/build/bin/llama-server",
];

function findBinary() {
  for (const p of CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function askLlama(prompt) {
  return new Promise((resolve, reject) => {
    const bin = findBinary();
    if (!bin) {
      return reject(
        "llama-server introuvable. Chemins testés:\n" + CANDIDATES.join("\n")
      );
    }
    if (!fs.existsSync(MODEL_PATH)) {
      return reject(
        "Modèle GGUF introuvable: " + MODEL_PATH
      );
    }

    let output = "";
    let error = "";

    const proc = spawn(bin, [
      "-m", MODEL_PATH,
      "-p", prompt,
      "-n", "256",
      "--temp", "0.7",
    ]);

    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (error += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) return reject(error || `llama exited ${code}`);
      resolve(output.trim());
    });
  });
}

module.exports = { askLlama };
