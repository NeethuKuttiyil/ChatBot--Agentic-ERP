// src/api/recommendationService.js
export const getERPCRMRecommendation = async (payload) => {
  try {
    const response = await fetch("http://localhost:3000/recommend-erp-crm", {
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
