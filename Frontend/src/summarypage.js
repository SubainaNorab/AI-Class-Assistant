// Frontend/src/components/SummaryPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const SummaryPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/summary/${fileId}`);  // ✅ same style as upload page
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Failed to fetch summary");

        setSummaryData(data);
      } catch (err) {
        console.error("❌ Error fetching summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [fileId]);

  if (loading) return <p>Loading summary...</p>;
  if (!summaryData) return <p>⚠️ Summary not available.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "15px" }}>
        ⬅ Back to Dashboard
      </button>
      
      <h1>{summaryData.original_name || summaryData.filename}</h1>

      <section style={{ marginTop: "20px" }}>
        <h2>📌 Summary</h2>
        <p>{summaryData.summary}</p>
      </section>

      <section style={{ marginTop: "20px" }}>
        <h2>📖 Full Content</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f9f9f9", padding: "10px", borderRadius: "5px" }}>
          {summaryData.content}
        </pre>
      </section>
    </div>
  );
};

export default SummaryPage;
