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
      this.renderMessage("assistant", "Could not connect. Make sure the proxy is running.");
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
