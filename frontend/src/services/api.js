// src/services/api.js
import axios from "axios";

const BASE_URL = "import.meta.env.VITE_API_URL";

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append("excelFile", file);

  const response = await axios.post(`${BASE_URL}/upload-and-analyze-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
