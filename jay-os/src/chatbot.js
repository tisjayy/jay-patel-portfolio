export default class Chatbot {
  constructor() {
    this.history = [];
    this.input = document.getElementById("chatbot-input");
    this.sendBtn = document.getElementById("chatbot-send");
    this.messages = document.getElementById("chatbot-messages");
    this.apiUrl = "/api/chat";
  }

  activateEvents() {
    this.sendBtn.addEventListener("click", () => this.sendMessage());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.input.addEventListener("input", () => {
      this.input.style.height = "auto";
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + "px";
    });
    this.renderWelcome();
  }

  renderWelcome() {
    const el = document.createElement("div");
    el.id = "chatbot-welcome";
    el.className = "chatbot-welcome";
    el.innerHTML = `
      <div class="chatbot-welcome-av">J</div>
      <h3>Hi, I'm Jay's AI</h3>
      <p>Ask me about Jay's projects, skills, experience, or anything else you'd like to know.</p>
    `;
    this.messages.appendChild(el);
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text) return;

    const welcome = document.getElementById("chatbot-welcome");
    if (welcome) welcome.remove();

    this.input.value = "";
    this.input.style.height = "auto";
    this.renderMessage("user", text);
    this.history.push({ role: "user", content: text });

    const typing = this.showTyping();

    try {
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: this.history }),
      });
      const data = await res.json();
      typing.remove();

      if (data.reply) {
        this.renderMessage("assistant", data.reply);
        this.history.push({ role: "assistant", content: data.reply });
      } else {
        this.renderMessage("assistant", "Sorry, something went wrong. Please try again.");
      }
    } catch (err) {
      typing.remove();
      this.showRetroError(
        "CRITICAL ERROR",
        "Neural link severed.\nFailed to reach AI backend.\n\nIf behind a corporate firewall, please view the Resume app instead."
      );
    }
  }

  renderMessage(role, content) {
    if (role === "user") {
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble-user";
      bubble.textContent = content;
      this.messages.appendChild(bubble);
    } else {
      const row = document.createElement("div");
      row.className = "chat-row-bot";
      const av = document.createElement("div");
      av.className = "chat-bot-av";
      av.textContent = "J";
      const text = document.createElement("div");
      text.className = "chat-bubble-bot";
      text.textContent = content;
      row.appendChild(av);
      row.appendChild(text);
      this.messages.appendChild(row);
    }
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  showRetroError(title, message) {
    // Remove any existing error dialog
    const existing = document.getElementById("chatbot-error-dialog");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "chatbot-error-dialog";
    dialog.style.cssText = [
      "position:absolute","top:50%","left:50%",
      "transform:translate(-50%,-50%)",
      "z-index:99999","width:320px",
      "background:#d4d0c8",
      "border:2px solid #fff",
      "outline:2px solid #808080",
      "font-family:Tahoma,sans-serif",
      "font-size:12px","box-shadow:4px 4px 8px rgba(0,0,0,0.6)",
    ].join(";");

    dialog.innerHTML = `
      <div style="background:linear-gradient(to right,#0a246a,#3a6ea5);color:#fff;padding:3px 6px;display:flex;align-items:center;justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:6px;"><img src="/imgs/icons/error.png" onerror="this.style.display='none'" style="width:16px;height:16px;"> ${title}</span>
        <button onclick="document.getElementById('chatbot-error-dialog').remove()" style="background:#d4d0c8;border:1px solid #808080;color:#000;width:16px;height:14px;font-size:10px;cursor:pointer;padding:0;line-height:1;">&#x2715;</button>
      </div>
      <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:32px;line-height:1;">&#x26A0;</span>
        <p style="margin:0;line-height:1.5;white-space:pre-line;">${message}</p>
      </div>
      <div style="text-align:center;padding:0 16px 12px;">
        <button onclick="document.getElementById('chatbot-error-dialog').remove()" style="min-width:75px;padding:3px 12px;background:#d4d0c8;border-top:1px solid #fff;border-left:1px solid #fff;border-right:1px solid #808080;border-bottom:1px solid #808080;cursor:pointer;font-family:Tahoma,sans-serif;font-size:12px;">OK</button>
      </div>
    `;

    // Attach to the chatbot window container so it stays in-frame
    const container = document.getElementById("chatbot") || document.body;
    container.style.position = container.style.position || "relative";
    container.appendChild(dialog);
  }

  showTyping() {
    const row = document.createElement("div");
    row.className = "chat-row-bot";
    const av = document.createElement("div");
    av.className = "chat-bot-av";
    av.textContent = "J";
    const dots = document.createElement("div");
    dots.className = "chat-typing";
    dots.innerHTML = "<span></span><span></span><span></span>";
    row.appendChild(av);
    row.appendChild(dots);
    this.messages.appendChild(row);
    this.messages.scrollTop = this.messages.scrollHeight;
    return row;
  }
}
