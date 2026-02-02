const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { askLlama } = require("./llama");

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   ROUTE CHAT – CLAWDBOT
========================= */
app.post("/api/chat", async (req, res) => {
  const message = req.body.message;

  console.log("🧠 Clawdbot actif. Message reçu :", message);

  if (!message || typeof message !== "string") {
    return res.json({
      ok: false,
      error: "Message invalide"
    });
  }

  try {
    const answer = await askLlama(message);

    res.json({
      ok: true,
      agent: "clawdbot",
      model: "local-gguf",
      answer: answer
    });

  } catch (err) {
    console.error("❌ Erreur modèle :", err);

    res.json({
      ok: false,
      error: String(err)
    });
  }
});

/* =========================
   FALLBACK FRONT
========================= */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Clawdbot + modèle GGUF en ligne sur le port ${PORT}`);
});
