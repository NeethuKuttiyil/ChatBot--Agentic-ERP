// backend/routes/imageAnalysisRoutes.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config(); // Ensure dotenv is loaded for API key

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Multer for temporary file storage

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use a model suitable for text generation from image input.
// gemini-2.0-flash is generally good for multimodal.
const GEMINI_MULTIMODAL_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Route for Image Analysis/Explanation
router.post("/", upload.single("image"), async (req, res) => {
    console.log("Backend: /api/analyze-image endpoint hit.");
    console.log("Backend: req.file received:", req.file ? "Yes" : "No", req.file);
    console.log("Backend: req.body received:", req.body); // Should contain prompt

    let imagePath = null;

    try {
        if (!req.file) {
            console.error("Backend: No image uploaded for analysis.");
            return res.status(400).json({ error: "No image uploaded for analysis." });
        }

        imagePath = req.file.path;

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        // The user can provide a specific prompt like "What does this image show?"
        // If not provided, a default prompt will be used.
        const userAnalysisPrompt = req.body.prompt || "Describe the content of this image in detail.";
        console.log("Backend: Analysis prompt:", `"${userAnalysisPrompt}"`);

        const geminiResponse = await axios.post(GEMINI_MULTIMODAL_URL, {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: base64Image,
                            },
                        },
                        {
                            text: userAnalysisPrompt, // Use the user's prompt or default
                        },
                    ],
                },
            ],
            // For analysis, we primarily want text output
            generationConfig: {
                temperature: 0.5, // Can be slightly higher for more descriptive text
                // responseMimeType: "text/plain", // This is the default if not specified or for simpler models
            },
        });

        const reply = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No descriptive text from Gemini.";

        console.log("Backend: Gemini Analysis Reply:", reply);
        res.json({ reply });

    } catch (err) {
        console.error("Image analysis error:", err.response?.data?.error || err.message);
        if (err.response && err.response.data && err.response.data.error) {
            res.status(err.response.status).json({
                error: "Gemini API error during image analysis",
                details: err.response.data.error.message,
                code: err.response.data.error.code
            });
        } else {
            res.status(500).json({ error: "Image analysis failed", details: err.message });
        }
    } finally {
        // Always clean up the temporary uploaded file
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
});

module.exports = router;