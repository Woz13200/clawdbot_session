const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.post('/', async (req, res) => {
  const prompt = req.body.prompt || '';

  const llama = spawn('llama-cpp', [
    '-m', 'models/gguf/tinyllama.gguf',
    '--threads', '4',
    '--ctx-size', '2048',
    '--temp', '0.8',
    '--top-p', '0.95',
    '--prompt', prompt
  ]);

  let output = '';
  llama.stdout.on('data', (data) => {
    output += data.toString();
  });

  llama.stderr.on('data', (data) => {
    console.error(`[stderr] ${data}`);
  });

  llama.on('close', (code) => {
    res.json({ response: output.trim() });
  });
});

module.exports = router;
