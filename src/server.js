import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("CDB backend alive (implicit pair)");
});

// Implicit pair: no key, always ok
app.post("/pair", (req, res) => {
  res.json({ ok: true, implicit: true });
});

// Generic message endpoint (no pairing required)
app.post("/message", (req, res) => {
  res.json({ ok: true, echo: req.body });
});

app.listen(PORT, () => {
  console.log("Listening on", PORT);
});
