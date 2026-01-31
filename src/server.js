import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// --- HTTP ---
app.get("/", (req, res) => {
  res.send("CDB backend alive (implicit pair + ws)");
});

app.post("/pair", (req, res) => {
  res.json({ ok: true, implicit: true });
});

app.post("/message", (req, res) => {
  res.json({ ok: true, echo: req.body ?? null });
});

// --- WS (required by extension over HTTPS -> WSS) ---
const server = http.createServer(app);

// Path MUST match what the extension uses.
// We'll expose /ws (classic).
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ ok: true, hello: "CDB WS ready" }));

  socket.on("message", (data) => {
    const text = data?.toString?.() ?? "";
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    socket.send(JSON.stringify({ ok: true, echo: payload }));
  });
});

server.listen(PORT, () => {
  console.log("Listening on", PORT);
  console.log("WS available on /ws");
});
