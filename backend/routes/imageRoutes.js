// backend/routes/imageRoutes.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// We will test if it at least produces *text* about the desired TO-BE diagram.
const GEMINI_MULTIMODAL_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;


router.post("/process-image", upload.single("image"), async (req, res) => {
    console.log("Backend: /process-image endpoint hit.");
    console.log("Backend: req.file received:", req.file ? "Yes" : "No", req.file);
    console.log("Backend: req.body received:", req.body);

    let imagePath = null;

    try {
        if (!req.file) {
            console.error("Backend: No image uploaded detected by Multer.");
            return res.status(400).json({ error: "No image uploaded." });
        }

        imagePath = req.file.path;

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        const userTransformationPrompt = req.body.prompt;
        console.log("Backend: Extracted prompt:", `"${userTransformationPrompt}"`);

        if (!userTransformationPrompt) {
            console.error("Backend: Prompt is empty or undefined, returning 400.");
            return res.status(400).json({ error: "No transformation prompt provided. Please tell me what TO-BE process you want." });
        }

        // --- Start of the problematic Axios call block ---
        console.log("Backend: Preparing Gemini API call for image processing...");
        const payload = {
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
                            text: `Analyze this AS-IS process diagram. Then, based on the following instruction: "${userTransformationPrompt}", describe in detail what the TO-BE process diagram would look like. Focus on the changes and new steps. Do NOT try to generate an image directly. Provide only text.`,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                // Explicitly request plain text as the response.
                // The current Gemini models via generateContent API are primarily text-in/text-out, image-in/text-out.
                // Direct image-in/image-out (transformation) is more advanced and may require different APIs or specific fine-tuned models.
                //responseMimeType: "text/plain",
            },
        };

        const geminiResponse = await axios.post(GEMINI_MULTIMODAL_URL, payload);
        console.log("Backend: Gemini API call successful."); // This line will tell us if the call went through

        const generatedText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
            // If we successfully get text, send it back. We are not expecting an image from this setup.
            res.json({ reply: generatedText.trim(), generatedImage: null }); // explicitly set generatedImage to null
        } else {
            console.error("Backend: Gemini returned no text for image processing prompt.");
            res.status(500).json({
                error: "Gemini returned no valid text response for image transformation request.",
                reply: "No textual output from Gemini for the image transformation request."
            });
        }

    } catch (err) {
        console.error("Image transformation error caught in backend:");
        if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
            console.error("Headers:", err.response.headers);
            res.status(err.response.status).json({
                error: "Gemini API error during image processing",
                details: err.response.data?.error?.message || "Unknown API error",
                code: err.response.data?.error?.code || err.response.status
            });
        } else if (err.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an http.ClientRequest in node.js
            console.error("No response received. Request:", err.request);
            res.status(500).json({ error: "No response from Gemini API for image processing." });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error setting up request:", err.message);
            res.status(500).json({ error: "Image processing failed at request setup", details: err.message });
        }
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
});

module.exports = router;