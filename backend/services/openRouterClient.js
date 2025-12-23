// backend/services/openRouterClient.js
/*const axios = require("axios");

async function askAI(prompt, model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini") {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ERP-Agentic-App"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("❌ OpenRouter API Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error || err.message);
  }
}

module.exports = { askAI };*/
