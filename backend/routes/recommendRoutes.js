// routes/recommendRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { excelSummary, specificNeeds, relevantDataDesc, analysisResults } = req.body;

    const prompt = `
Business Context: ${relevantDataDesc || "Not provided"}
Specific Needs: ${specificNeeds || "Not specified"}
Excel Summary: ${excelSummary || "N/A"}
Issues: ${analysisResults?.join("\n") || "None"}

Based on this, recommend a suitable ERP or CRM system with a brief explanation.
`;

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const summary = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

    console.log("✅ Gemini Response Summary:", summary);

    res.json({
      summary, // 👈 this matches your frontend expectations
      issues: analysisResults || []
    });
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
    res.status(500).json({
      error: "Gemini request failed",
      details: err.message
    });
  }
});

module.exports = router;
