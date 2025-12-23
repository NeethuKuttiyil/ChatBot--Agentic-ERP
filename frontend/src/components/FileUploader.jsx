import { uploadExcel } from "../services/api";

const FileUploader = ({ onFileProcessed }) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Optional: show "Uploading..." message in chat
      const result = await uploadExcel(file);

      // Pass data to parent (like ChatPage) if needed
      onFileProcessed(result);

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
    }
  };

  return (
    <label>
     <input
      type="file"
      accept=".xlsx, .xls"
      multiple
      onChange={handleFileUpload}
    />
      <button>📁 Upload</button>
    </label>
  );
};

export default FileUploader;
