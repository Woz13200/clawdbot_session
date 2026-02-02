import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boot, chat, status } from "./llama.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, ...status() });
});

app.post("/api/chat", async (req, res) => {
  try {
    const msg = String(req.body?.message || "").trim();
    if (!msg) return res.status(400).json({ ok: false, error: { message: "Empty message", code: 400 } });

    // ✅ on tente un boot si pas prêt
    await boot();

    const reply = await chat(msg);
    return res.json({ ok: true, reply });
  } catch (e) {
    const code = Number(e.code || 500);
    const type = e.type || "unknown_error";
    return res.status(code).json({
      ok: false,
      error: { message: String(e.message || e), type, code }
    });
  }
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, async () => {
  console.log(`[BOOT] PORT=${PORT}`);
  // ✅ démarrage en arrière-plan (mais sans bloquer le serveur)
  boot().catch(() => {});
  console.log(`[BOOT] Listening on ${PORT}`);
});
