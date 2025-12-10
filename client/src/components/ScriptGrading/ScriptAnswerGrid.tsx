// components/ScriptAnswerGrid.tsx
import React, { useEffect, useState } from "react";
import { ScriptAnswer } from "../../types/ScriptAnswer";
import ScriptService from "../../services/ScriptService";

interface Props {
  scriptAnswers: ScriptAnswer[];
  onSelect: (s: ScriptAnswer) => void;
}

export default function ScriptAnswerGrid({ scriptAnswers, onSelect }: Props) {
  const [scriptTitles, setScriptTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadScriptTitles = async () => {
      setLoading(true);
      const titles: Record<string, string> = {};

      for (const sa of scriptAnswers) {
        try {
          const script = await ScriptService.getScriptById(sa.scriptId);
          titles[sa.scriptId] = script.title || sa.scriptId;
        } catch (error) {
          console.error(`Failed to load script ${sa.scriptId}:`, error);
          titles[sa.scriptId] = sa.scriptId; // Fallback to ID if fetch fails
        }
      }

      setScriptTitles(titles);
      setLoading(false);
    };

    if (scriptAnswers.length > 0) {
      loadScriptTitles();
    }
  }, [scriptAnswers]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, 200px)",
      gap: "10px"
    }} data-testid="script-answer-grid">
      {scriptAnswers.map(sa => (
        <div
          key={sa.id}
          data-testid={`script-answer-row-${sa.id}`}
          onClick={() => onSelect(sa)}
          style={{
            padding: "12px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <strong>Script: {loading ? "Loading..." : scriptTitles[sa.scriptId] || sa.scriptId}</strong><br />
          Student: {sa.student}<br />
          Grade: {sa.grade ?? "—"}
        </div>
      ))}
    </div>
  );
}
