// data/excelStore.js

const excelDataStore = {
  uploadedFilesData: {}, // { filename: { type: 'excel'|'pdf'|'docx'|'txt', content: jsonData | extractedText } }
  asIsModel: "",         // Last generated AS-IS model
};

module.exports = excelDataStore;