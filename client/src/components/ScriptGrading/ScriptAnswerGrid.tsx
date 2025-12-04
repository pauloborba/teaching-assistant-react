// components/ScriptAnswerGrid.tsx
import React from "react";
import { ScriptAnswer } from "../../types/ScriptAnswer";

interface Props {
  scriptAnswers: ScriptAnswer[];
  onSelect: (s: ScriptAnswer) => void;
}

export default function ScriptAnswerGrid({ scriptAnswers, onSelect }: Props) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, 200px)",
      gap: "10px"
    }}>
      {scriptAnswers.map(sa => (
        <div
          key={sa.id}
          onClick={() => onSelect(sa)}
          style={{
            padding: "12px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <strong>Script: {sa.scriptId}</strong><br />
          Student: {sa.studentId}<br />
          Grade: {sa.grade ?? "—"}
        </div>
      ))}
    </div>
  );
}
