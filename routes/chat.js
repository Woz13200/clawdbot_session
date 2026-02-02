const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const prompt = req.body?.message || req.body?.prompt;

    if (!prompt) {
      return res.json({ reply: "❌ Aucun message reçu." });
    }

    const llama = spawn('./llama.cpp/bin/llama-cli', [
      '-m', 'models/gguf/tinyllama.gguf',
      '-p', prompt,
      '--n-predict', '256'
    ]);

    let output = '';

    llama.stdout.on('data', (data) => {
      output += data.toString();
    });

    llama.stderr.on('data', (data) => {
      console.error('[llama stderr]', data.toString());
    });

    llama.on('close', () => {
      // 🔐 JSON GARANTI
      res.json({
        reply: output.trim() || "⚠️ Le modèle n’a rien répondu."
      });
    });

  } catch (err) {
    console.error(err);
    res.json({
      reply: "❌ Erreur serveur Moltbot."
    });
  }
});

module.exports = router;
