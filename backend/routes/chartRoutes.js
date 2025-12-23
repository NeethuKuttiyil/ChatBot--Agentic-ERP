// backend/routes/chartRoutes.js
const express = require("express");
const axios = require("axios");
const store = require("../data/excelStore"); // To access uploaded Excel data
require("dotenv").config(); // Ensure dotenv is loaded for API key

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Define the JSON schema for Chart.js data (This is for your reference in the prompt, not sent directly to API)
// const CHART_SCHEMA = { ... }; // Keep this as a conceptual schema for your prompt design

router.post("/", async (req, res) => {
    const { message } = req.body; // User's request (e.g., "show sales by month")
    const uploadedData = store.uploadedFilesData; // All uploaded data: { fileName: { type: 'excel'|'pdf'|..., content: ... } }

    console.log("Backend: /api/chart endpoint hit.");
    console.log("User message for chart:", message);
    console.log("Uploaded Data Keys:", Object.keys(uploadedData));

    if (!message) {
        return res.status(400).json({ error: "No message provided for chart generation." });
    }

    let contextData = "";
    // excelFileContents is not directly needed here if AI generates full chartData
    // However, if you want the AI to only tell you which columns to use and then
    // you process the raw excelFileContents on the backend, then keep this.
    // For now, let's assume AI generates the full chartData.

    if (Object.keys(uploadedData).length > 0) {
        contextData = Object.entries(uploadedData)
            .map(([name, fileDetails]) => {
                let sampleContent = "";
                let headers = "";

                if (fileDetails.type === 'excel' && fileDetails.content) {
                    const rows = fileDetails.content;
                    if (Array.isArray(rows) && rows.length > 0) {
                        headers = Object.keys(rows[0]).join(", ");
                        sampleContent = rows.slice(0, Math.min(rows.length, 5)).map(row => JSON.stringify(row)).join("\n");
                        return `File: ${name} (Type: Excel, ${rows.length} rows)\nHeaders: ${headers}\nSample Data:\n${sampleContent}`;
                    } else if (typeof rows === 'object' && rows !== null && !Array.isArray(rows)) {
                        const sheetNames = Object.keys(rows);
                        if (sheetNames.length > 0 && Array.isArray(rows[sheetNames[0]]) && rows[sheetNames[0]].length > 0) {
                            const firstSheetRows = rows[sheetNames[0]];
                            headers = Object.keys(firstSheetRows[0]).join(", ");
                            sampleContent = firstSheetRows.slice(0, Math.min(firstSheetRows.length, 5)).map(row => JSON.stringify(row)).join("\n");
                            return `File: ${name} (Type: Excel, Sheet '${sheetNames[0]}', ${firstSheetRows.length} rows)\nHeaders: ${headers}\nSample Data:\n${sampleContent}`;
                        }
                    }
                    console.warn(`[Chart Route] Excel content for '${name}' is not an array or expected sheet object format.`);
                    return `File: ${name} (Type: Excel, Content not usable for charting or sampling.)`;

                } else if (typeof fileDetails.content === 'string') {
                    sampleContent = fileDetails.content.substring(0, Math.min(fileDetails.content.length, 200));
                    sampleContent = sampleContent.replace(/\n/g, ' ').trim();
                    return `File: ${name} (Type: ${fileDetails.type.toUpperCase()}, ${fileDetails.content.length} chars)\nSample Text: "${sampleContent}..."`;
                } else {
                    return `File: ${name} (Type: ${fileDetails.type || 'unknown'}, Content not available or recognized.)`;
                }
            })
            .filter(item => item)
            .join("\n\n");
    }

    if (contextData.length === 0 && Object.keys(uploadedData).length > 0) {
        console.warn("[Chart Route] Uploaded files found, but no usable text or Excel data for context.");
        contextData = "No usable Excel or text data found in uploaded files for chart generation context.";
    } else if (Object.keys(uploadedData).length === 0) {
         console.log("[Chart Route] No files uploaded. Context is empty.");
         contextData = "No files have been uploaded.";
    }

    const prompt = `
You are an expert data analyst and visualization specialist.
The user has provided a request and potentially uploaded file data (detailed below).
Analyze the user's request and the provided file data context.
If the request and data allow, determine the most appropriate chart type (bar, line, or pie) and extract the necessary data (labels, data points) from the Excel data provided in the context.
Aggregate data if necessary (e.g., sum values by category, count occurrences).
Provide a concise explanation of the chart.

**Important:** Respond ONLY with a JSON object. Do NOT include any other text outside the JSON.
The JSON object must strictly follow this structure:
\`\`\`json
{
  "chartType": "string", // Must be "bar", "line", "pie", or "none" if no chart can be generated
  "chartData": { // Required only if chartType is NOT "none"
    "labels": ["string"],
    "datasets": [{
      "label": "string",
      "data": [number],
      "backgroundColor": ["string"], // Optional, provide reasonable colors if needed
      "borderColor": ["string"],     // Optional
      "borderWidth": 1               // Optional
    }]
  },
  "explanation": "string" // A textual explanation of the chart or why it couldn't be generated
}
\`\`\`
If you cannot generate a chart, set "chartType" to "none" and provide an "explanation".

File Data Context (Excel data samples and other file types):
${contextData}

User Request: "${message}"

Example of expected JSON output for a bar chart:
{
  "chartType": "bar",
  "chartData": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Monthly Sales",
      "data": [100, 150, 120],
      "backgroundColor": ["rgba(75, 192, 192, 0.6)", "rgba(153, 102, 255, 0.6)", "rgba(255, 159, 64, 0.6)"],
      "borderColor": ["rgba(75, 192, 192, 1)", "rgba(153, 102, 255, 1)", "rgba(255, 159, 64, 1)"],
      "borderWidth": 1
    }]
  },
  "explanation": "This bar chart shows the total sales for January, February, and March."
}
Example if no chart can be generated:
{
  "chartType": "none",
  "explanation": "I need specific numerical data or a clearer request to generate a chart. Please upload data or refine your query, e.g., 'Show total sales by product'."
}
`;

    try {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                //responseMimeType: "application/json", // This is the key for direct JSON output
            },
            // REMOVE toolConfig: {} AND jsonSchema as they are causing the error
            // They are for specific "tool calling" features, not general JSON output
        };


        console.log("Backend: Preparing Gemini API call for chart generation...");
        // console.log("Backend: Gemini Payload:", JSON.stringify(payload, null, 2)); // Temporarily uncomment for full payload debugging if needed

        const result = await axios.post(GEMINI_URL, payload);
        console.log("Backend: Gemini API call successful for chart generation.");

        // When using responseMimeType: "application/json", the response is directly the JSON string
        const geminiResponseText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!geminiResponseText) {
            console.error("Gemini returned no text for chart generation, or no candidates.");
            console.error("Raw Gemini response data:", JSON.stringify(result.data, null, 2));
            return res.status(500).json({ error: "Gemini returned no valid response for chart generation." });
        }

        let cleaned = geminiResponseText
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

        let chartResponse;
        try {
            chartResponse = JSON.parse(cleaned);
        } catch (jsonErr) {
            console.error("Failed to parse cleaned JSON:", jsonErr);
            console.error("Cleaned Gemini JSON:", cleaned);
            return res.status(500).json({
                error: "Gemini returned malformed JSON.",
                details: cleaned
            });
        }


        if (chartResponse.chartType === "none") {
            return res.status(200).json({ reply: chartResponse.explanation || "Could not generate a chart based on your request and data." });
        }

        // Validate the structure of the incoming chart data
        if (!chartResponse.chartData || !Array.isArray(chartResponse.chartData.labels) || chartResponse.chartData.labels.length === 0 ||
            !Array.isArray(chartResponse.chartData.datasets) || chartResponse.chartData.datasets.length === 0 ||
            !chartResponse.chartData.datasets[0].data || !Array.isArray(chartResponse.chartData.datasets[0].data) || chartResponse.chartData.datasets[0].data.length === 0) {
            console.error("Gemini's chartData is incomplete or invalid:", chartResponse);
             return res.status(500).json({ error: "AI generated an invalid chart data structure. Missing labels or datasets, or data.", details: chartResponse });
        }

        res.json(chartResponse); // Send the structured chart data back to frontend

    } catch (err) {
        console.error("Chart generation error caught in backend:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
            console.error("Headers:", err.response.headers);
            let errorMessage = "Gemini API error during chart generation";
            if (err.response.data && typeof err.response.data === 'string' && err.response.data.includes("Input text too long")) {
                 errorMessage = "The prompt for chart generation (including uploaded data) is too long for the AI model. Try smaller files or a more concise request.";
            } else if (err.response.data && err.response.data.error && err.response.data.error.message) {
                 errorMessage = err.response.data.error.message;
            }
            res.status(err.response.status).json({
                error: errorMessage,
                details: err.response.data?.error?.message || "Unknown API error",
                code: err.response.data?.error?.code || err.response.status
            });
        } else if (err.request) {
            console.error("No response received from Gemini API for chart generation. Request:", err.request);
            res.status(500).json({ error: "No response from Gemini API for chart generation." });
        } else {
            console.error("Error setting up request for chart generation:", err.message);
            res.status(500).json({ error: "Chart generation failed at request setup", details: err.message });
        }
    }
});

module.exports = router;