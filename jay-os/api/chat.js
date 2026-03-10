// Vercel serverless function — deployed automatically when you run `vercel --prod`
// Set AWS_BEARER_TOKEN_BEDROCK and AWS_REGION in Vercel dashboard > Environment Variables

const https = require("https");
const { SYSTEM_PROMPT } = require("../chatbot-knowledge");

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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages } = req.body;
    const reply = await callBedrock(messages);
    res.json({ reply });
  } catch (err) {
    console.error("Bedrock error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
