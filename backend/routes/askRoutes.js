// routes/askRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  const { question, context } = req.body;

  const prompt = `
You are an assistant that answers questions based on Excel data.

Context (from Excel file):
${context}

Question:
${question}

Answer concisely based only on the context above.
`;

  try {
    const result = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const answer = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No answer from Gemini";
    res.json({ answer });
  } catch (err) {
    console.error("❌ Q&A Error:", err.message);
    res.status(500).json({ error: "Failed to get answer", details: err.message });
  }
});

module.exports = router;
// This route handles questions about the uploaded Excel data.