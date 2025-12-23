// backend/routes/excelAnalysisRoutes.js
const express = require("express");
const axios = require("axios"); // Keep axios for the direct API call
const store = require("../data/excelStore");
require("dotenv").config();

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// IMPORTANT: Confirm this URL and model name are correct for your Gemini API setup.
// If you are using the @google/generative-ai SDK, you don't need this URL directly.
// But since your original code uses axios directly, we keep it.
const GEMINI_TEXT_ONLY_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// NEW ROUTE: Analyzes all currently stored Excel data
router.post("/consolidated-analysis", async (req, res) => {
    console.log("Backend: /api/excel-analysis/consolidated-analysis endpoint hit.");
    try {
        const allUploadedFiles = store.uploadedFilesData;
        // Filter to get only Excel files
        const excelFileNames = Object.keys(allUploadedFiles).filter(name =>
            allUploadedFiles[name].type === 'excel'
        );

        if (excelFileNames.length === 0) {
            console.log("No Excel files found in store for consolidated analysis.");
            return res.status(200).json({ // Return 200 OK with a message, not 400 error
                excelSummary: "No Excel data available for analysis. Please upload Excel files first.",
                domain: "N/A",
                relationshipsInsights: "N/A",
                analysisResults: ["No Excel data to analyze."]
            });
        }

        // Prepare context from only Excel files
        let allDataContext = "";
        let totalRows = 0;
        excelFileNames.forEach(name => { // Iterate over filtered Excel file names
            const dataContent = allUploadedFiles[name].content; // Access the actual data array
            if (Array.isArray(dataContent)) { // Ensure it's an array before processing
                totalRows += dataContent.length;
                // Provide a sample for each file for context
                allDataContext += `--- File: ${name} (${dataContent.length} rows) ---\n`;
                // Take up to 20 rows per file for the sample
                allDataContext += `Sample:\n${JSON.stringify(dataContent.slice(0, Math.min(dataContent.length, 20)), null, 2)}\n\n`;
            } else {
                console.warn(`File ${name} is marked as Excel but its content is not an array. Skipping.`);
            }
        });

        // If no actual Excel data content was found after filtering
        if (allDataContext.trim() === "") {
             console.log("No valid Excel data content found after filtering for consolidated analysis.");
             return res.status(200).json({
                excelSummary: "No valid Excel data content found for analysis. Files might be empty or malformed.",
                domain: "N/A",
                relationshipsInsights: "N/A",
                analysisResults: ["No valid Excel data to analyze."]
            });
        }


        const prompt = `
        You are an expert business data analyst and process consultant.
        I have uploaded ${excelFileNames.length} Excel files with a total of approximately ${totalRows} rows. Here are samples from each file:

        ${allDataContext}

        Please provide a concise, consolidated summary of the overall business data across all these files.
        Identify the primary business domains or processes these files likely relate to (e.g., Sales, Inventory, Finance, HR, Order-to-Cash).
        Point out any cross-file relationships, potential data quality issues, inconsistencies, or key insights that span multiple files.
        Suggest how these files might be related to each other in a business process.

        Format your response with the following sections:
        ## Consolidated Data Summary
        ## Primary Business Domains/Processes
        ## Cross-File Relationships & Insights
        ## Potential Issues & Recommendations
        `;

        console.log("Sending consolidated analysis prompt to Gemini...");
        // console.log("Prompt to Gemini (truncated):", prompt.substring(0, 1000) + "..."); // Optional: for detailed debugging

        const geminiResponse = await axios.post(
            GEMINI_TEXT_ONLY_URL,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    //responseMimeType: "text/plain",
                },
            },
            {
                timeout: 30000 // Add a timeout for the API call (e.g., 30 seconds)
            }
        );

        const fullSummaryText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No consolidated summary from Gemini.";
        console.log("Received full summary from Gemini.");
        // console.log("Full Gemini Response (truncated):", fullSummaryText.substring(0, 1000)); // Optional: for detailed debugging

        // Attempt to parse out sections for structured output
        let consolidatedSummary = fullSummaryText;
        let primaryDomains = "Unspecified";
        let relationshipsInsights = "None identified.";
        let issuesRecommendations = "None identified.";

        const summaryMatch = fullSummaryText.match(/## Consolidated Data Summary\s*([\s\S]*?)(?=## Primary Business Domains\/Processes|$)/i);
        const domainsMatch = fullSummaryText.match(/## Primary Business Domains\/Processes\s*([\s\S]*?)(?=## Cross-File Relationships & Insights|$)/i);
        const relationshipsMatch = fullSummaryText.match(/## Cross-File Relationships & Insights\s*([\s\S]*?)(?=## Potential Issues & Recommendations|$)/i);
        const issuesRecMatch = fullSummaryText.match(/## Potential Issues & Recommendations\s*([\s\S]*)/i);

        if (summaryMatch && summaryMatch[1]) consolidatedSummary = summaryMatch[1].trim();
        if (domainsMatch && domainsMatch[1]) primaryDomains = domainsMatch[1].trim();
        if (relationshipsMatch && relationshipsMatch[1]) relationshipsInsights = relationshipsMatch[1].trim();
        if (issuesRecMatch && issuesRecMatch[1]) issuesRecommendations = issuesRecMatch[1].trim();

        res.json({
            excelSummary: consolidatedSummary,
            domain: primaryDomains,
            analysisResults: issuesRecommendations.split('\n').filter(line => line.trim() !== '' && line.trim().startsWith('-')), // Convert issues to array, assuming bullet points
            relationshipsInsights: relationshipsInsights,
            rawGeminiResponse: fullSummaryText // For debugging
        });

    } catch (err) {
        console.error("❌ Consolidated Excel Analysis API Error:", err.message);
        if (err.response) {
            console.error("Gemini API Status:", err.response.status);
            console.error("Gemini API Error Data:", err.response.data);
            if (err.response.status === 400 && err.response.data.error.message.includes("API key not valid")) {
                console.error("ACTION REQUIRED: Your GEMINI_API_KEY might be invalid or improperly configured.");
            }
        } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            console.error("Gemini API Request timed out.");
            err.message = "Gemini API request timed out. The data might be too large or the network is slow.";
        }
        res.status(500).json({
            error: "Consolidated Excel analysis failed",
            details: err.message,
            geminiDetails: err.response ? err.response.data : null
        });
    }
});

module.exports = router;