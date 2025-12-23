// src/components/RecommendationChat.jsx (or similar)
import React, { useState } from "react";
import { getERPCRMRecommendation } from "../api/recommendationService";

const RecommendationChat = () => {
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetRecommendation = async () => {
    const payload = {
      excelSummary: "Summary of uploaded Excel data...",
      specificNeeds: "Sales pipeline tracking",
      relevantDataDesc: "Lead data from multiple sources",
      analysisResults: ["Missing customer ID in some rows", "Duplicate entries in 'leads'"]
    };

    setLoading(true);
    const result = await getERPCRMRecommendation(payload);
    setRecommendation(result.summary || result.error);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleGetRecommendation}>Get Recommendation</button>
      {loading && <p>Loading...</p>}
      {recommendation && (
        <div>
          <h3>Recommendation:</h3>
          <p>{recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default RecommendationChat;
