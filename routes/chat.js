const express = require("express");
const router = express.Router();

/**
 * Route centrale Clawdbot
 * Le modèle local est le cerveau
 * Clawdbot est l'agent décisionnel
 */
router.post("/", async (req, res) => {
  try {
    const userInput = req.body.message || "";

    // ⚠️ TEMPORAIRE : réponse mock structurée
    // (le modèle GGUF sera branché juste après)
    const response = {
      agent: "clawdbot",
      status: "ok",
      intent: "chat",
      input: userInput,
      output: "Je suis Clawdbot. Prêt à agir.",
      actions: [],
      memory_write: false
    };

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({
      agent: "clawdbot",
      status: "error",
      error: err.message
    });
  }
});

module.exports = router;
