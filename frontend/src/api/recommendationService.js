// src/api/recommendationService.js
export const getERPCRMRecommendation = async (payload) => {
  try {
    const response = await fetch(import.meta.env.VITE_API_URL + "/recommend-erp-crm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    return { error: error.message };
  }
};
