import express from "express";
import { WebSocketServer } from "ws";
import net from "net";
import http from "http";
import { act, ensure } from "./agent/browser.js";

const app = express();
app.use(express.json({ limit: "20mb" }));

const PORT = Number(process.env.PORT || 10000);
const NOVNC_DIR = "/usr/share/novnc";

app.get("/", (_, res) => res.send("Clawdbot backend alive (Playwright + Live View)"));

app.get("/view", (_, res) => {
  res.type("html").send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Clawdbot Live View</title>
  <style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style>
</head>
<body>
  <iframe src="/novnc/vnc.html?autoconnect=1&resize=remote&reconnect=1&reconnect_delay=2000&path=websockify"></iframe>
</body>
</html>
  `);
});

app.use("/novnc", express.static(NOVNC_DIR, { fallthrough: false }));

app.post("/api/act", async (req, res) => {
  try {
    await ensure();                 // lance le navigateur au besoin
    const out = await act(req.body);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

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
    try { vnc.write(Buffer.from(data)); } catch {}
  });

  vnc.on("data", (chunk) => {
    try { ws.send(chunk); } catch {}
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

httpServer.listen(PORT, () => {
  console.log("[CDB] Listening on", PORT);
  console.log("[CDB] Live view: /view");
  console.log("[CDB] Actions: POST /api/act");
});
