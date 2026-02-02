const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(express.static("public"));

/* =========================
   ROUTE API /api/chat
   ========================= */
app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        status: "error",
        error: "No message provided"
      });
    }

    // Réponse TEMPORAIRE (preuve de vie Clawdbot)
    return res.json({
      status: "ok",
      output: `🧠 Clawdbot actif. Message reçu : "${message}"`
    });

  } catch (err) {
    console.error("API CHAT ERROR:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal error",
      detail: String(err)
    });
  }
});

app.listen(PORT, () => {
  console.log("✅ Clawdbot server running on port", PORT);
});
