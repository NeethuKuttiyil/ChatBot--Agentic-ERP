// backend/routes/compareRoutes.js

const express = require("express");
const store = require("../data/excelStore");
const fetch = require("node-fetch");

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// GET /compare/differences
router.get("/differences", (req, res) => {
  const fileNames = Object.keys(store.uploadedFilesData);

  if (fileNames.length < 2) {
    return res.status(400).json({ error: "Need at least two files to compare." });
  }

  const keys = fileNames.map(name => Object.keys(store.uploadedFilesData[name][0] || {}));
  const common = keys.reduce((a, b) => a.filter(k => b.includes(k)));
  const differences = fileNames.map((name, i) => ({
    file: name,
    uniqueKeys: keys[i].filter(k => !common.includes(k)),
  }));

  res.json({ commonColumns: common, differences });
});

// GET /compare/as-is-model
router.get("/as-is-model", async (req, res) => {
  const allData = Object.values(store.uploadedFilesData).flat();

  if (!allData.length) {
    return res.status(400).json({ error: "No data uploaded." });
  }

  const prompt = `You are an ERP consultant. Given this Excel data, identify:
- Key entities (e.g., Orders, Customers, Products)
- Relationships
- Process flow
- Data quality issues
\n${JSON.stringify(allData.slice(0, 100), null, 2)}`;

  try {
    const result = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await result.json();
    store.asIsModel = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    res.json({ asIsModel: store.asIsModel });
  } catch (err) {
    console.error("AS-IS generation error", err);
    res.status(500).json({ error: "Failed to generate AS-IS", details: err.message });
  }
});

// POST /compare/to-be-model
router.post("/to-be-model", async (req, res) => {
  const { targetERP } = req.body;

  if (!store.asIsModel) {
    return res.status(400).json({ error: "AS-IS model not available yet." });
  }

  const prompt = `Map this AS-IS model to the ERP system "${targetERP}". Suggest:
- ERP modules needed
- Suggested data fields
- Optimized process steps

AS-IS Model:\n${store.asIsModel}`;

  try {
    const result = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await result.json();
    const toBeModel = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    res.json({ toBeModel });
  } catch (err) {
    console.error("TO-BE generation error", err);
    res.status(500).json({ error: "Failed to generate TO-BE", details: err.message });
  }
});

module.exports = router;
