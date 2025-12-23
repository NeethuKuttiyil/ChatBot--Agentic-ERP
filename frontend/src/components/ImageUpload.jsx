// ImageUpload.jsx
import React, { useState } from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import axios from "axios";

export default function ImageUpload() {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("");

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setStatus("");
  };

  const handleUpload = async () => {
    if (!image) return setStatus("Please select an image.");
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await axios.post("http://localhost:3000/upload-image", formData);
      setStatus(`✅ Uploaded: ${response.data.result.filename}`);
    } catch (err) {
      setStatus("❌ Upload failed.");
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <Button variant="contained" onClick={handleUpload} disabled={!image}>
        Upload
      </Button>
      <Typography sx={{ mt: 1 }}>{status}</Typography>
    </div>
  );
}
