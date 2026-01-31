import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("CDB backend alive");
});

app.post("/pair", (req, res) => {
  res.json({ ok: true, implicit: true });
});
});

app.listen(PORT, () => {
  console.log("Listening on", PORT);
});
