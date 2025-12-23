// backend/routes/chatRoutes.js
const express = require("express");
const axios = require("axios");
const store = require("../data/excelStore"); // Assuming you use this for uploadedFilesData
require("dotenv").config();

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// IMPORTANT: Ensure this URL and model 'gemini-2.0-flash' are correct for your API setup.
// 'gemini-pro' is generally recommended for text generation tasks for robustness.
// If you face issues, consider changing to 'gemini-pro'.
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;


router.post("/", async (req, res) => {
    const { message } = req.body;
    console.log(`[Chat Route] Received message: "${message}"`); // Log incoming message

    const dataToUse = store.uploadedFilesData;

    if (!message) {
        console.warn("[Chat Route] No message provided. Returning 400."); // Log warning
        return res.status(400).json({ error: "❌ No message provided for text chat." });
    }

    let contextData = "";
    if (Object.keys(dataToUse).length > 0) {
        // Corrected logic here: Iterate over entries and handle different content types
        contextData = Object.entries(dataToUse)
            .map(([name, fileDetails]) => { // 'fileDetails' now correctly represents the object {type, content}
                let sampleContent = "";
                if (fileDetails.type === 'excel' && Array.isArray(fileDetails.content)) {
                    // For Excel data (array of objects), slice the array
                    sampleContent = JSON.stringify(fileDetails.content.slice(0, Math.min(fileDetails.content.length, 10)), null, 2);
                    return `${name} (Excel, ${fileDetails.content.length} rows) Sample:\n${sampleContent}`;
                } else if (typeof fileDetails.content === 'string') {
                    // For PDF, DOCX, TXT data (string), use substring
                    // Take first 200 characters to prevent excessive context length
                    sampleContent = fileDetails.content.substring(0, Math.min(fileDetails.content.length, 200));
                    // Replace newlines for better display in prompt
                    sampleContent = sampleContent.replace(/\n/g, ' ').trim();
                    return `${name} (${fileDetails.type.toUpperCase()}, ${fileDetails.content.length} chars) Sample: "${sampleContent}..."`;
                } else {
                    // Fallback for other or unsupported types
                    return `${name} (Type: ${fileDetails.type}, content not directly sampled for chat context.)`;
                }
            })
            .join("\n\n");
        console.log("[Chat Route] Generated contextData (truncated):", contextData.substring(0, 500) + "..."); // Log context
    } else {
        console.log("[Chat Route] No uploaded files to provide context.");
    }


    const prompt = `
You are an ERP/CRM business process consultant.

${contextData ? `Given the uploaded file data (samples below, if applicable), and the user's request:` : `Given the user's request:`}

Here is the user's request: ${message}

${contextData ? `Use the data below to infer the structure, entities (like Orders, Customers), relationships, and processes, or answer general questions. Focus on the most recent or relevant context if multiple files are present:` : `Answer general business process, ERP/CRM, or general knowledge questions.`}

${contextData}

Respond concisely and professionally. Don't apologize or say you can't do something. Infer the most likely answer.
`;
    console.log("[Chat Route] Full prompt to Gemini (truncated):", prompt.substring(0, 1000) + "..."); // Log full prompt


    try {
        console.log("[Chat Route] Sending request to Gemini API..."); // Log before API call
        const result = await axios.post(GEMINI_URL, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.0, // Keeping low temperature for factual responses
            },
        }, {
            timeout: 30000 // Add a timeout for the API call (e.g., 30 seconds)
        });

        const reply = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
        console.log("[Chat Route] Received reply from Gemini (truncated):", reply.substring(0, 200) + "..."); // Log reply
        res.json({ reply });
    } catch (err) {
        console.error("❌ [Chat Route] Gemini chat failed:", err.message); // Log error message
        if (err.response) {
            console.error("[Chat Route] Gemini API Details:", err.response.status, err.response.data); // Log API response details
            if (err.response.status === 400 && err.response.data?.error?.message?.includes("API key not valid")) {
                err.message = "Gemini API Key is invalid or improperly configured.";
            } else if (err.response.status === 400 && err.response.data?.error?.message?.includes("Input text too long")) {
                err.message = "The chat prompt (including file context) is too long for the AI model. Try a shorter message or fewer files.";
            }
        } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            console.error("[Chat Route] Gemini API Request timed out.");
            err.message = "Gemini API request timed out. This might be due to network issues or a very large prompt.";
        }

        res.status(500).json({ error: "Gemini chat failed", details: err.response?.data?.error?.message || err.message });
    }
});

module.exports = router;