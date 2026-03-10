// Local dev proxy — runs on port 8085 alongside the webpack dev server.
// Handles CORS so localhost:8082 can call Bedrock without exposing keys to the browser.
// Start with: node proxy.js  (run-all.ps1 does this automatically)

require("dotenv").config();
const http = require("http");
const https = require("https");
const { SYSTEM_PROMPT } = require("./chatbot-knowledge");

const REGION = process.env.AWS_REGION || "us-east-1";
const MODEL_ID = "amazon.nova-lite-v1:0";

function callBedrock(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      system: [{ text: SYSTEM_PROMPT }],
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
      })),
    });

    const options = {
      hostname: `bedrock-runtime.${REGION}.amazonaws.com`,
      path: `/model/${MODEL_ID}/converse`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.message || JSON.stringify(parsed)));
          else resolve(parsed.output.message.content[0].text);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { messages } = JSON.parse(body);
        const reply = await callBedrock(messages);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        console.error("Bedrock error:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8085, () => {
  console.log("\x1b[34mChatbot proxy running on http://localhost:8085\x1b[0m");
});
