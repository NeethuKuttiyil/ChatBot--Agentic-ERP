// backend/routes/dataUploadRoutes.js

const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const store = require("../data/excelStore");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /data/upload
router.post("/upload", upload.array("excelFiles"), (req, res) => {
  try {
    req.files.forEach((file) => {
      const workbook = xlsx.readFile(file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(sheet);
      store.uploadedFilesData[file.originalname] = jsonData;
    });

    res.json({
      message: "✅ Files uploaded and processed.",
      files: Object.keys(store.uploadedFilesData),
    });
  } catch (err) {
    console.error("Upload failed", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

module.exports = router;
