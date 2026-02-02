const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const statusEl = document.getElementById("status");

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function send(prompt) {
  statusEl.textContent = "⏳ Moltbot réfléchit...";
  try {
    const r = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Request failed");
    return data.text || "";
  } finally {
    statusEl.textContent = "✅ prêt";
  }
}

addMsg("bot", "Salut Mohammed. Je suis Moltbot. Dis-moi ce que tu veux faire.");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = input.value.trim();
  if (!p) return;
  input.value = "";
  addMsg("you", p);

  addMsg("bot", "…");
  const last = chat.lastChild;

  try {
    const ans = await send(p);
    last.textContent = ans || "(silence)";
  } catch (err) {
    last.textContent = `❌ Erreur: ${err.message}`;
  }
});
