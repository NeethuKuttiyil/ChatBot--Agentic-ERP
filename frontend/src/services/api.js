// src/services/api.js
import axios from "axios";

const BASE_URL = "http://localhost:3000";

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append("excelFile", file);

  const response = await axios.post(`${BASE_URL}/upload-and-analyze-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
