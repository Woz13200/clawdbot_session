import express from "express";
import { WebSocketServer } from "ws";
import net from "net";
import http from "http";
import crypto from "crypto";
import { act, ensure } from "./agent/browser.js";

const app = express();
app.use(express.json({ limit: "20mb" }));

const PORT = Number(process.env.PORT || 10000);
const NOVNC_DIR = "/usr/share/novnc";

// ===== FUSION MANIFEST (renvoyé à chaque /api/session) =====
// Tu peux modifier le texte si tu veux, mais garde la structure en string.
const FUSION_MANIFEST = [
  "FUSION_MANIFEST_V1",
  "SYSTEM",
  "- Tu es le cerveau opérationnel connecté à Clawdbot/Moltbot via ce backend.",
  "- Chaque action DOIT passer par /api/act. Pas d'invention de résultats.",
  "- Si une action n'est pas exécutable, tu renvoies ok:false + raison.",
  "",
  "CAPABILITIES",
  "- terminal_exec : exécuter une commande shell sur la machine du backend.",
  "- browser_act   : actions Playwright (navigation/clics/texte/DOM/etc.) via ./agent/browser.js",
  "- live_view     : accès /view (noVNC) pour observer le navigateur distant.",
  "",
  "RULES",
  "- Toujours créer une session via /api/session avant d'agir.",
  "- Toujours inclure sessionId dans les requêtes /api/act.",
  "- Toujours retourner des sorties brutes (stdout/stderr/exit_code) quand dispo.",
  "",
  "END"
].join("\n");

// ===== Sessions (mémoire côté serveur) =====
// Note: c'est une persistance "process memory" (réinitialisée si redeploy/restart).
// Mais ça suffit pour éviter "Missing sessionId" et garder un contexte côté backend.
const SESSIONS = new Map(); // sessionId -> { client, type, createdAt, expiresAt }

function nowIso() {
  return new Date().toISOString();
}

function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function newSessionId() {
  // Format lisible + aléatoire solide
  return "sess_" + crypto.randomBytes(16).toString("hex");
}

function requireSession(req, res) {
  const sessionId = req.body?.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ ok: false, error: "Missing sessionId" });
    return null;
  }
  const s = SESSIONS.get(sessionId);
  if (!s) {
    res.status(401).json({ ok: false, error: "Invalid sessionId" });
    return null;
  }
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    SESSIONS.delete(sessionId);
    res.status(401).json({ ok: false, error: "Session expired" });
    return null;
  }
  return sessionId;
}

// ===== Routes =====

app.get("/", (_, res) => {
  res.send("Clawdbot backend alive (Playwright + Live View)");
});

app.get("/view", (_, res) => {
  res.type("html").send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Clawdbot Live View</title>
  <style>
    html,body{margin:0;height:100%;background:#000}
    iframe{border:0;width:100%;height:100%}
  </style>
</head>
<body>
  <iframe src="/novnc/vnc.html?autoconnect=1&resize=remote&reconnect=1&reconnect_delay=2000&path=websockify"></iframe>
</body>
</html>
  `);
});

app.use("/novnc", express.static(NOVNC_DIR, { fallthrough: false }));

// ✅ Création session
app.post("/api/session", (req, res) => {
  try {
    const client = typeof req.body?.client === "string" ? req.body.client : "unknown";
    const type = typeof req.body?.type === "string" ? req.body.type : "default";

    const sessionId = newSessionId();
    const createdAt = nowIso();
    const expiresAt = addHours(createdAt, 24).toISOString();

    SESSIONS.set(sessionId, { client, type, createdAt, expiresAt });

    res.json({
      success: true,
      sessionId,
      fusion_manifest: FUSION_MANIFEST,
      createdAt,
      expiresAt,
      message: "New session created successfully"
    });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e?.message || e) });
  }
});

// ✅ Action API (Playwright + terminal selon ton agent)
app.post("/api/act", async (req, res) => {
  try {
    // session obligatoire
    const sessionId = requireSession(req, res);
    if (!sessionId) return;

    // lance le navigateur au besoin
    await ensure();

    // Délègue à ton agent
    const out = await act(req.body);

    // out doit être un objet { ok: boolean, ... }
    if (!out || typeof out !== "object") {
      return res.status(500).json({ ok: false, error: "Agent returned invalid response" });
    }
    if (!out.ok) return res.status(400).json(out);

    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ===== Websockify bridge (noVNC -> VNC server :5900) =====

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = req.url || "";
  if (url.startsWith("/websockify")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  const vnc = net.connect(5900, "127.0.0.1");

  ws.on("message", (data) => {
    try {
      vnc.write(Buffer.from(data));
    } catch {}
  });

  vnc.on("data", (chunk) => {
    try {
      ws.send(chunk);
    } catch {}
  });

  const cleanup = () => {
    try { vnc.destroy(); } catch {}
    try { ws.close(); } catch {}
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
  vnc.on("close", cleanup);
  vnc.on("error", cleanup);
});

// ===== Start =====

httpServer.listen(PORT, () => {
  console.log("[CDB] Listening on", PORT);
  console.log("[CDB] Live view: /view");
  console.log("[CDB] Create session: POST /api/session");
  console.log("[CDB] Actions: POST /api/act");
});
