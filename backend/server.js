// backend/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");
const fs = require("fs");
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
require("dotenv").config();

// --- Import your separate route files ---
// You will still import these, but they will be handled by mainRouter
const imageRoutes = require("./routes/imageRoutes");
const chatRoutes = require("./routes/chatRoutes");
const imageAnalysisRoutes = require("./routes/imageAnalysisRoutes");
const chartRoutes = require("./routes/chartRoutes");
const processInsightRoutes = require("./routes/processInsightRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const excelAnalysisRoutes = require("./routes/excelAnalysisRoutes");
const documentAnalysisRoutes = require("./routes/documentAnalysisRoutes");

// NEW: Import the main router for intent recognition
const mainRouter = require("./routes/mainRouter"); // <-- Import the new main router

// --- Import your shared data store ---
const store = require("./data/excelStore");

const app = express();
const port = 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Multer setup
const upload = multer({ dest: "uploads/" });

// --- Mount ALL your routes here for clarity ---
// IMPORTANT: You'll now use the mainRouter for all *text-based AI queries*.
// Other specific routes (like file upload, AS-IS diagram generation) remain.

// Mount the new main router for AI text queries (e.g., chat, chart requests, document analysis questions)
app.use("/api/ai_query", mainRouter); // <-- All frontend text queries should go here now

// Keep other specific routes that handle different types of input or have distinct purposes
app.use("/api", imageRoutes); // Handles /api/process-image (for AS-IS to TO-BE / diagram generation)
app.use("/api/analyze-image", imageAnalysisRoutes); // Handles /api/analyze-image (for general image analysis)
app.use("/api/process-insight", processInsightRoutes); // Process insight routes
app.use("/api/recommend", recommendRoutes); // Recommend routes
app.use("/api/excel-analysis", excelAnalysisRoutes); // Excel analysis routes

// The following routes will be primarily called internally by mainRouter,
// but they might still be exposed if you want direct access for debugging or specific use cases.
// However, the intent-based routing assumes they won't be called directly by the frontend for text queries.
// If mainRouter completely takes over, you could potentially remove these lines.
// For now, keep them, but understand their role changes.
app.use("/api/chat", chatRoutes);
app.use("/api/chart", chartRoutes);
app.use("/api/document-analysis", documentAnalysisRoutes);


// Route for general file upload (now handles Excel, PDF, DOCX, TXT)
app.post("/upload-files", upload.array("files"), async (req, res) => {
    console.log("Backend: /upload-files endpoint hit.");
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        const processedFiles = [];
        for (const file of req.files) {
            const filename = file.originalname;
            const filePath = file.path;
            let fileContent = null;
            let fileType = 'unknown';

            try {
                if (file.mimetype.includes("excel") || file.mimetype.includes("spreadsheetml")) {
                    const workbook = xlsx.readFile(filePath);
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    fileContent = xlsx.utils.sheet_to_json(sheet);
                    fileType = 'excel';
                    console.log(`Processed Excel file: ${filename}`);
                } else if (file.mimetype === 'application/pdf') {
                    const dataBuffer = fs.readFileSync(filePath);
                    const data = await pdf(dataBuffer);
                    fileContent = data.text;
                    fileType = 'pdf';
                    console.log(`Processed PDF file: ${filename}`);
                } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // .docx
                    const dataBuffer = fs.readFileSync(filePath);
                    const result = await mammoth.extractRawText({ buffer: dataBuffer });
                    fileContent = result.value;
                    fileType = 'docx';
                    console.log(`Processed DOCX file: ${filename}`);
                } else if (file.mimetype === 'text/plain') {
                    fileContent = fs.readFileSync(filePath, 'utf8');
                    fileType = 'txt';
                    console.log(`Processed TXT file: ${filename}`);
                } else if (file.mimetype.includes('image')) { // Handle images if needed
                    // For images, you might want to store the path or a base64 string
                    // or directly pass them to an image analysis route.
                    // For now, let's just note them and not store content in excelStore unless text extracted.
                    console.log(`Detected image file: ${filename}. Content not stored in memory for AI context.`);
                    fileType = 'image';
                    // If you want to integrate image analysis here:
                    // You'd need to store the image path or convert to base64
                    // store.uploadedFilesData[filename] = { type: fileType, path: filePath };
                    // For now, just unlink the temp file.
                    fs.unlinkSync(filePath); // Clean up temp file for unsupported images for AI text context
                    continue; // Skip to next file
                }
                else {
                    console.warn(`Unsupported file type uploaded: ${file.mimetype} - ${filename}. Skipping.`);
                    fs.unlinkSync(filePath);
                    continue;
                }

                store.uploadedFilesData[filename] = { type: fileType, content: fileContent };
                processedFiles.push({ filename, type: fileType });
                fs.unlinkSync(filePath);

            } catch (parseError) {
                console.error(`ERROR processing file ${filename}:`, parseError);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                processedFiles.push({ filename, type: fileType, error: parseError.message });
            }
        }

        res.json({
            message: "✅ Files uploaded and processed.",
            files: processedFiles
        });

    } catch (err) {
        console.error("Upload failed in /upload-files route:", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('AI Assistant Backend is running!');
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});