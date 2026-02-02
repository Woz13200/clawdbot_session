const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

// Static UI
app.use("/", express.static(path.join(__dirname, "public")));

// Chat route
const chatRoute = require("./routes/chat.cjs");
app.use("/chat", chatRoute);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Moltbot UI online on port ${PORT}`);
});
