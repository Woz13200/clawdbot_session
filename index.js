import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { runLocalGGUF } from "./llama.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static UI
app.use(express.static(path.join(__dirname, "public")));

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ One single API endpoint for the UI
app.post("/api/chat", async (req, res) => {
  try {
    const msg = (req.body?.message || "").trim();
    if (!msg) return res.status(400).json({ error: "missing message" });

    const out = await runLocalGGUF(msg, {
      modelPath: "/app/models/gguf/tinyllama.gguf",
      nPredict: 256,
      temp: 0.7,
    });

    return res.json({ ok: true, reply: String(out).trim() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[BOOT] Listening on ${PORT}`);
});
