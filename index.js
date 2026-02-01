const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Route chat
const chatRoute = require('./routes/chat');
app.use('/chat', chatRoute);

app.listen(port, () => {
  console.log(`[🚀] Serveur Moltbot lancé sur http://localhost:${port}`);
});
