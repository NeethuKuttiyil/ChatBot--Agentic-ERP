// routes/excelRoutes.js
const express = require("express");
const fs = require("fs");
const xlsx = require("xlsx");

const router = express.Router();

router.post("/", (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const workbook = xlsx.readFile(req.file.path);
        const issues = [];

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
            if (data.length === 0) {
                issues.push(`Sheet "${sheetName}" is empty`);
            }
        });

        fs.unlinkSync(req.file.path); // cleanup
        res.json({ issues, message: "Excel analyzed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to process Excel", details: err.message });
    }
});

module.exports = router;
