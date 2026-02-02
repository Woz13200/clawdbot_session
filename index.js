import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { boot, chat, status } from "./llama.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

// Static UI
app.use(express.static(path.join(__dirname, "public")));

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// Status (frontend polls this)
app.get("/api/status", async (req, res) => {
  try {
    const st = await status();
    res.json({ ok: true, status: st });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: String(e?.message || e) } });
  }
});

// Chat
app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ ok: false, error: { message: "message vide" } });
    }

    // ensure model+server are up
    const st = await boot();
    if (!st.ready) {
      return res.status(503).json({
        ok: false,
        error: { message: "Loading model", type: "unavailable_error", code: 503, details: st }
      });
    }

    const reply = await chat(message);
    return res.json({ ok: true, reply });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: { message: String(e?.message || e), type: "server_error", code: 500 }
    });
  }
});

// Fallback: serve UI
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log(`[WEB] Listening on ${PORT}`);
});
