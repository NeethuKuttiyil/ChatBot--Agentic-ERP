// backend/routes/processInsightRoutes.js
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_ONLY_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/", async (req, res) => {
    const { processDescription, requestType } = req.body;

    console.log("Backend: /api/process-insight endpoint hit.");
    console.log("Backend: Received processDescription:", processDescription ? processDescription.substring(0, 100) + "..." : "No description");
    console.log("Backend: Received requestType:", requestType);

    if (!processDescription) {
        return res.status(400).json({ error: "No process description provided." });
    }
    // Updated list of allowed request types
    if (!requestType || !['suggest_improvements', 'conceptual_simulation', 'automation_steps', 'generate_documentation'].includes(requestType)) {
        return res.status(400).json({ error: "Invalid or missing request type." });
    }

    let prompt = "";
    switch (requestType) {
        case 'suggest_improvements':
            prompt = `
            You are an expert business process analyst.
            Analyze the following AS-IS process description. Identify any potential bottlenecks, inefficiencies, redundant steps, or areas for improvement.
            Provide concrete, actionable suggestions to make the process more efficient and effective.

            AS-IS Process Description:
            ${processDescription}

            Suggestions for Improvement:
            `;
            break;
        case 'conceptual_simulation':
            prompt = `
            You are a process simulation expert.
            Imagine the following process is being executed. Describe a conceptual step-by-step walkthrough of the process.
            Identify any potential challenges, benefits, or interesting interactions that might occur during its execution.
            Do not provide numerical simulation, focus on qualitative analysis.

            Process Description:
            ${processDescription}

            Conceptual Simulation Analysis:
            `;
            break;
        case 'automation_steps':
            prompt = `
            You are an expert in business process automation.
            Review the following process description. For each step, suggest if and how it could be automated, and what types of tools or technologies (e.g., RPA, CRM workflows, API integrations, specific software features) could be used.
            Focus on practical automation opportunities.

            Process Description:
            ${processDescription}

            Automation Opportunities:
            `;
            break;
        // NEW CASE: Process Documentation
        case 'generate_documentation':
            prompt = `
            You are an expert business analyst responsible for creating clear and concise process documentation.
            Based on the following process description, generate structured documentation. Include:
            - A clear title for the process.
            - A brief overview.
            - A list of main steps, clearly numbered or bulleted.
            - For each step, identify typical inputs and outputs.
            - Identify key roles/stakeholders involved.
            - Mention any critical decision points.
            - Suggest potential KPIs (Key Performance Indicators) to measure this process (if applicable).

            Process Description:
            ${processDescription}

            Process Documentation:
            `;
            break;
        default:
            return res.status(400).json({ error: "Unknown request type." });
    }

    try {
        console.log("Backend: Preparing Gemini API call for process insight...");
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4,
               // responseMimeType: "text/plain",
            },
        };

        const result = await axios.post(GEMINI_TEXT_ONLY_URL, payload);
        console.log("Backend: Gemini API call successful for process insight.");

        const geminiResponseText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Backend: Raw Gemini response for process insight:", geminiResponseText ? geminiResponseText.substring(0, 200) + "..." : "No text");

        if (!geminiResponseText) {
            console.error("Backend: Gemini returned no text for process insight.");
            return res.status(500).json({ error: "Gemini returned no valid text response for process insight." });
        }

        res.json({ reply: geminiResponseText.trim() });

    } catch (err) {
        console.error("Backend: Process insight generation error caught:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
            console.error("Headers:", err.response.headers);
            res.status(err.response.status).json({
                error: "Gemini API error during process insight generation",
                details: err.response.data?.error?.message || "Unknown API error",
                code: err.response.data?.error?.code || err.response.status
            });
        } else if (err.request) {
            console.error("No response received from Gemini API for process insight. Request:", err.request);
            res.status(500).json({ error: "No response from Gemini API for process insight." });
        } else {
            console.error("Error setting up request for process insight:", err.message);
            res.status(500).json({ error: "Process insight failed at request setup", details: err.message });
        }
    }
});

module.exports = router;