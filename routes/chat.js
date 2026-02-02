const express = require("express");
const router = express.Router();

/*
  Route POST /api/chat
  Interface entre la UI et Clawdbot (assistant autonome)
*/
router.post("/", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        status: "error",
        error: "No message provided"
      });
    }

    // ⚠️ TEMPORAIRE : réponse minimale stable
    // (on branchera le modèle GGUF + Clawdbot juste après)
    const reply = `🧠 Clawdbot a bien reçu : "${message}"`;

    return res.json({
      status: "ok",
      output: reply
    });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal server error",
      detail: String(err)
    });
  }
});

module.exports = router;
