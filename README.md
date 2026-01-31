# clawdbot — UI brain without API (Android-only pairing)

Tu n’as pas de PC: on “pair” la session depuis l’extension Lemur.
- Tu te connectes au chat (ChatGPT/DeepSeek/Grok) dans Lemur
- Popup extension → Pair current site
- L’extension envoie cookies + localStorage au backend Render
- Render reconstruit storageState Playwright et peut piloter l’UI

Gateway:
- https://<service>.onrender.com
- wss://<service>.onrender.com/ws
