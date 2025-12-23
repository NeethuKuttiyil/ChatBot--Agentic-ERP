// backend/routes/documentAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// and data is read from the shared store.
const store = require("../data/excelStore"); // Import the shared data store
require("dotenv").config(); // Ensure dotenv is loaded to access process.env.GEMINI_API_KEY

// --- Initialize Google Generative AI ---
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in .env file for document analysis.");
    process.exit(1); // Exit if API key is missing
}

const genAI = new GoogleGenerativeAI(API_KEY);

// THIS IS THE CRUCIAL CORRECTION FOR THE MODEL NAME:
// Use the model name from .env, or default to "gemini-2.5-flash"
const MODEL_NAME_TEXT = process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME_TEXT });

// --- Route for Document Analysis (Frontend calls /api/document-analysis/analyze) ---
router.post('/analyze', async (req, res) => {
    const { filename, analysisType, question } = req.body;
    console.log(`[DocumentAnalysis] Request received for filename: ${filename}, type: ${analysisType}, question: ${question || 'N/A'}`);

    if (!filename) {
        console.error("[DocumentAnalysis] Error: Filename is required for document analysis.");
        return res.status(400).json({ error: "Filename is required for document analysis." });
    }

    // Retrieve file content from the shared store
    const fileData = store.uploadedFilesData[filename];
    if (!fileData) {
        console.error(`[DocumentAnalysis] Error: Document '${filename}' not found in server's memory (store.uploadedFilesData).`);
        return res.status(404).json({ error: `Document '${filename}' not found in server's memory. Please ensure it was uploaded successfully.` });
    }
    if (!fileData.content) {
        console.error(`[DocumentAnalysis] Error: Content for '${filename}' is empty or invalid. Type: ${fileData.type}`);
        return res.status(400).json({ error: `Content for document '${filename}' could not be retrieved. It might be an unsupported format or corrupted.` });
    }

    const documentText = fileData.content;

    // Validate that the content is actually text (from PDF, DOCX, TXT)
    if (typeof documentText !== 'string' || documentText.length === 0) {
        console.error(`[DocumentAnalysis] Error: Content for '${filename}' is not valid text for analysis. Actual type: ${typeof documentText}, length: ${documentText.length}`);
        return res.status(400).json({ error: `Document '${filename}' content is not valid text for analysis.` });
    }

    console.log(`[DocumentAnalysis] Extracted document text length for '${filename}': ${documentText.length} characters.`);
    if (documentText.length < 50) { // Adjust threshold as needed
        console.warn(`[DocumentAnalysis] Warning: Document text is very short for '${filename}'. Actual length: ${documentText.length}. AI analysis might be limited.`);
        // You might consider returning an early response here if the text is too short to be meaningful
    }

    let prompt = "";
    // let aiAnalysisResult = ""; // No need for this variable here, directly use apiResponse.text()

    // Customize prompts based on analysisType
    switch (analysisType) {
        case "summarize":
            prompt = `Summarize the following document content:\n\n${documentText}`;
            break;
        case "extract-entities":
            prompt = `Extract key entities (people, organizations, locations, dates, keywords) from the following document:\n\n${documentText}`;
            break;
        case "answer-question":
            if (!question) {
                console.error("[DocumentAnalysis] Error: Question is required for 'answer-question' type.");
                return res.status(400).json({ error: "Question is required for answer-question analysis." });
            }
            prompt = `Based on the following document, answer the question: "${question}"\n\nDocument:\n${documentText}`;
            break;
        default: // 'general' analysis
            prompt = `Analyze the following document and provide key insights, a summary, and any relevant information:\n\n${documentText}`;
    }

    console.log(`[DocumentAnalysis] Prepared prompt (truncated, first 500 chars): ${prompt.substring(0, 500)}...`);

    try {
        console.log("[DocumentAnalysis] Attempting to call Gemini API...");
        // THIS IS THE ONLY model.generateContent CALL NEEDED
        const result = await model.generateContent(prompt, { // <<-- Apply generationConfig here
            generationConfig: {
                temperature: 0.0, // Set to 0.0 for maximum consistency
                // If you want JSON output for document analysis, add:
                // responseMimeType: "application/json"
            }
        });
        const apiResponse = await result.response;
        console.log("[DocumentAnalysis] Gemini API call successful.");

        if (!apiResponse || !apiResponse.text()) {
            console.warn("[DocumentAnalysis] Gemini API returned no text content.");
            return res.status(500).json({ error: 'AI analysis failed: No text content from Gemini.' });
        }

        const aiAnalysisResult = apiResponse.text(); // Get the text result
        res.json({
            message: "Document analysis complete.",
            filename,
            analysisType,
            aiAnalysis: aiAnalysisResult
        });

    } catch (error) {
        console.error("[DocumentAnalysis] ERROR during document AI analysis:", error);
        let errorMessage = "Failed to perform AI analysis on the document.";

        if (error.status && error.statusText) { // GoogleGenerativeAIFetchError or similar
            console.error(`[DocumentAnalysis] Gemini API Response Error Status: ${error.status}`);
            console.error(`[DocumentAnalysis] Gemini API Response Error Details: ${JSON.stringify(error.errorDetails || error.message)}`);

            if (error.status === 404) {
                errorMessage = `AI analysis error: Model '${MODEL_NAME_TEXT}' not found or not supported. Check model name and API key.`;
            } else if (error.status === 400 && error.message.includes("API key not valid")) {
                errorMessage = "AI analysis error: Gemini API Key is invalid or improperly configured.";
            } else if (error.status === 400 && error.message.includes("Input text too long")) {
                errorMessage = "AI analysis error: Document text is too long for the AI model. Try a shorter document or a more specific query.";
            } else {
                errorMessage = `AI analysis error: Gemini API returned status ${error.status}: ${error.statusText || 'Unknown error'}. Details: ${error.message}`;
            }
        } else if (error.message) { // General JS error or network error
            errorMessage = `AI Analysis error: ${error.message}`;
        }

        res.status(500).json({
            error: errorMessage,
            details: error.message,
            promptSent: prompt.substring(0, 200) + "...",
            geminiApiErrorDetails: error.errorDetails || (error.response ? error.response.data : null)
        });
    }
    // The duplicate model.generateContent call was removed from here.
});

module.exports = router;