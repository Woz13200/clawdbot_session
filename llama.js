const { spawn } = require("child_process");

const MODEL_PATH = "./models/tinyllama.gguf";
const LLAMA_BIN = "./llama-server"; 
// ⚠️ adapte si ton binaire s'appelle différemment (ex: ./bin/llama-server)

function askLlama(prompt) {
  return new Promise((resolve, reject) => {
    let output = "";
    let error = "";

    const llama = spawn(LLAMA_BIN, [
      "-m", MODEL_PATH,
      "-p", prompt,
      "-n", "256",
      "--temp", "0.7"
    ]);

    llama.stdout.on("data", (data) => {
      output += data.toString();
    });

    llama.stderr.on("data", (data) => {
      error += data.toString();
    });

    llama.on("close", (code) => {
      if (code !== 0) {
        return reject(error || `llama exited with code ${code}`);
      }
      resolve(output.trim());
    });
  });
}

module.exports = { askLlama };
