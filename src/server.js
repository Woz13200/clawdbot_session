import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import PQueue from "p-queue";
import { setSession, listSessions } from "./sessionStore.js";
import { runBrain } from "./worker.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req,res)=>res.json({ok:true, sessions:listSessions().length}));
app.get("/", (req,res)=>res.send("clawdbot ok"));

app.post("/pair/init", (req,res)=>{
  const  = Math.random().toString(36).slice(2) + Date.now().toString(36);
  res.json({ ok:true,  });
});

app.post("/pair/submit", (req,res)=>{
  const { , storageState } = req.body || {};
  if (! || !storageState) return res.status(400).json({ok:false, error:"missing /storageState"});
  if (!Array.isArray(storageState.cookies)) return res.status(400).json({ok:false, error:"storageState.cookies must be array"});
  setSession(, { storageState, at: Date.now() });
  res.json({ ok:true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const queue = new PQueue({ concurrency: Number(process.env.CDB_CONCURRENCY || 1) });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type:"clawdbot_reply", text:"Connected ✓ (Pair your site from the extension)" }));

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { msg = { type:"raw", text: buf.toString() }; }
    if (msg?.type === "hello") return;
    if (msg?.type !== "user_prompt" || typeof msg.text !== "string") return;

    const prompt = msg.text.trim();
    if (!msg.) return ws.send(JSON.stringify({ type:"clawdbot_reply", text:"Error: missing . Pair first in popup." }));

    queue.add(async () => {
      try{
        const reply = await runBrain(prompt, {
          : msg.,
          target: msg.target || process.env.CDB_TARGET || "chatgpt",
          chatUrl: msg.chatUrl || process.env.CDB_CHAT_URL || undefined,
          headless: process.env.CDB_HEADLESS !== "0"
        });
        ws.send(JSON.stringify({ type:"clawdbot_reply", text: reply }));
      }catch(e){
        ws.send(JSON.stringify({ type:"clawdbot_reply", text: "Error: "+e.message }));
      }
    });
  });
});

const port = process.env.PORT || 10000;
server.listen(port, "0.0.0.0", () => console.log("Listening on", port));
