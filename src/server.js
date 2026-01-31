import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("CDB backend alive");
});

app.post("/pair", (req, res) => {
  const pairKey = Math.random().toString(36).slice(2) + Date.now();
  res.json({ ok: true, pairKey });
});

app.listen(PORT, () => {
  console.log("Listening on", PORT);
});
