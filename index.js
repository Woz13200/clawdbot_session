const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(express.static("public"));

// 🔗 ROUTE API
const chatRoute = require("./routes/chat");
app.use("/api/chat", chatRoute);

app.listen(port, () => {
  console.log("✅ Clawdbot server alive on port", port);
});
