// backend/routes/mainRouter.js
const express = require('express');
const axios = require('axios');
const router = express.Router(); // This router will handle /api/ai_query
const store = require('../data/excelStore');
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// IMPORTANT: Do NOT import the specific route handlers as functions here.
// Instead, we will directly 'route' the request to their respective paths.
// Ensure these paths match how they are mounted in server.js.
// For example, chatRoutes is mounted at /api/chat.

router.post('/process_query', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "No message provided." });
    }

    // --- Step 1: Intent Recognition Prompt ---
    const intentPrompt = `
        You are an intelligent router. Your task is to classify the user's request into one of the following categories:
        - "chart_generation": If the user explicitly asks for a chart, graph, visualization, or data representation (e.g., "show sales by month", "pie chart for revenue", "plot this data").
        - "document_analysis": If the user asks for analysis of an uploaded document, like summarizing, extracting entities, or answering questions based on the document (e.g., "summarize this PDF", "what are the key points in the AS-IS document", "extract names from the report").
        - "simulation_explanation": If the user asks to simulate a process, explain a concept, or provide a conceptual walkthrough (e.g., "simulate initial assessment", "explain OKRs", "describe the discovery phase").
        - "general_chat": For any other general conversation, greetings, or questions that don't fit the above categories.

        **Important:** Respond ONLY with a JSON object. Do not include any other text, explanations, or conversational remarks.
        The JSON object must strictly follow this structure:
        \`\`\`json
        {
          "intent": "string", // Must be one of the predefined categories
          "details": "string" // (Optional) Any specific details extracted from the query.
        }
        \`\`\`
        User Request: "${message}"
    `;

    try {
        const geminiIntentResult = await axios.post(GEMINI_URL, {
            contents: [{ parts: [{ text: intentPrompt }] }],
            generationConfig: {
                temperature: 0.0,
                //responseMimeType: "application/json",
            },
        }, {
            timeout: 10000 // Shorter timeout for quick intent classification
        });

        const intentResponseText = geminiIntentResult.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!intentResponseText) {
            console.error("[MainRouter] Gemini returned no intent classification text.");
            return res.status(500).json({ error: "Could not classify user intent." });
        }

        let intentData;
        try {
            intentData = JSON.parse(intentResponseText);
        } catch (jsonParseError) {
            console.error("[MainRouter] Failed to parse Gemini's intent JSON:", jsonParseError);
            console.error("Malformed intent JSON:", intentResponseText);
            // Fallback to general chat if intent parsing fails
            // This is crucial for robustness
            console.log("[MainRouter] Falling back to general chat due to intent parsing error.");
            return axios.post(`http://localhost:3000/api/chat`, { message }, { timeout: 30000 })
                .then(chatRes => res.json(chatRes.data))
                .catch(err => res.status(500).json({ error: "Failed to process request due to intent classification error and chat fallback failure." }));
        }

        const userIntent = intentData.intent;
        console.log(`[MainRouter] User intent classified as: ${userIntent}`);

        // --- Step 2: Route Based on Intent ---
        // Instead of directly calling functions, we'll make *internal* API calls
        // to your already mounted routes. This keeps the modules self-contained.
        let targetApiEndpoint = '';
        let requestBody = { message }; // Default request body

        if (userIntent === "chart_generation") {
            // Check for uploaded Excel data before attempting chart generation
            const hasExcelData = Object.values(store.uploadedFilesData).some(fd => fd.type === 'excel' && Array.isArray(fd.content) && fd.content.length > 0);
            if (!hasExcelData) {
                return res.json({ reply: "I need Excel data to generate charts. Please upload an Excel file first." });
            }
            targetApiEndpoint = `/api/chart`; // Route to your chart generation logic
        } else if (userIntent === "document_analysis") {
            // For document analysis, you need a filename and potentially analysisType/question
            // This is a simplified example. You might need to extract filename/question from 'message'
            // or from 'intentData.details' if your intent prompt is sophisticated enough to provide them.
            // For now, let's assume 'message' contains the 'question' and 'filename' is extracted or prompted.
            // You might need a more complex interaction pattern here or have the frontend send filename.

            const uploadedFileNames = Object.keys(store.uploadedFilesData).join(", ");
            // Simple check: if only one file is uploaded, assume it's that. Else, ask user.
            if (Object.keys(store.uploadedFilesData).length === 1) {
                 requestBody = {
                     filename: Object.keys(store.uploadedFilesData)[0],
                     analysisType: "answer-question", // Default, AI can infer from 'question'
                     question: message
                 };
            } else if (Object.keys(store.uploadedFilesData).length > 1) {
                // If multiple files, AI might need to deduce filename from prompt or ask user
                // For simplicity here, let's just return a message asking user to specify.
                return res.json({ reply: `Please specify which document to analyze (e.g., "${uploadedFileNames}").` });
            } else {
                return res.json({ reply: "Please upload a document before asking for document analysis." });
            }

            targetApiEndpoint = `/api/document-analysis/analyze`; // Route to document analysis logic
        } else if (userIntent === "simulation_explanation" || userIntent === "general_chat") {
            targetApiEndpoint = `/api/chat`; // Route to your general chat logic
        } else {
            // Fallback for unclassified intents
            console.warn(`[MainRouter] Unrecognized intent: ${userIntent}. Falling back to general chat.`);
            targetApiEndpoint = `/api/chat`;
        }

        // Make an internal API call to the determined endpoint
        const apiResponse = await axios.post(`http://localhost:3000${targetApiEndpoint}`, requestBody, {
            timeout: 60000 // Longer timeout for actual AI processing
        });
        res.json(apiResponse.data); // Forward the response from the specific API

    } catch (error) {
        console.error("[MainRouter] Error in intent recognition or routing:", error);
        let errorMessage = "An error occurred while processing your request.";
        let errorDetails = error.message;

        if (error.response) {
            console.error("[MainRouter] Internal API Call Error Status:", error.response.status);
            console.error("[MainRouter] Internal API Call Error Data:", error.response.data);
            errorMessage = error.response.data?.error || errorMessage;
            errorDetails = error.response.data?.details || error.message;
        }

        // Final fallback: try general chat if everything else fails
        console.log("[MainRouter] Falling back to general chat due to processing error.");
        try {
            const chatRes = await axios.post(`http://localhost:3000/api/chat`, { message }, { timeout: 30000 });
            res.json(chatRes.data);
        } catch (chatError) {
            console.error("[MainRouter] Final chat fallback also failed:", chatError.message);
            res.status(500).json({
                error: errorMessage,
                details: errorDetails,
                finalFallbackAttemptFailed: true
            });
        }
    }
});

module.exports = router;