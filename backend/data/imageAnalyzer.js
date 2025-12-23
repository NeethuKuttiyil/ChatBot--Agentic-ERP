// data/imageAnalyzer.js

const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType: "image/png" } },
    "Please describe this image and extract relevant insights.",
  ]);

  const response = await result.response;
  return response.text();
}

module.exports = { analyzeImage };
