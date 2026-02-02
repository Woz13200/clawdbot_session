const express = require("express");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "moltbot", time: new Date().toISOString() });
});

// Chat API (UI -> POST /api/chat)
app.post("/api/chat", async (req, res) => {
  const prompt = (req.body && req.body.prompt) ? String(req.body.prompt) : "";

  if (!prompt.trim()) {
    return res.status(400).json({ error: "prompt vide" });
  }

  // IMPORTANT:
  // Pour l’instant, on garantit que l’UI marche et que Render ne crashe plus.
  // Le branchement du modèle local arrive juste après (prochain bloc).
  return res.json({
    reply: `✅ Moltbot est en ligne.\nTu as dit: ${prompt}\n\n(Le modèle local n’est pas branché encore.)`
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Moltbot UI: http://0.0.0.0:${PORT}`);
});
