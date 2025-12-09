// pages/GradingPage.tsx
import React, { useState, useEffect } from "react";
import { ScriptAnswer } from "../../types/ScriptAnswer";
import { ScriptAnswerService } from "../../services/ScriptAnswerService";
import ScriptAnswerGrid from "./ScriptAnswerGrid"
import ScriptGrading from "./ScriptGrading";

interface Props {
    onError: (errorMessage: string) => void;
}

export default function GradingPage({onError}: Props) {
  const [scriptAnswers, setScriptAnswers] = useState<ScriptAnswer[]>([]);
  const [selected, setSelected] = useState<ScriptAnswer | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await ScriptAnswerService.getAllScriptAnswers();
        setScriptAnswers(data);
      } catch (error) {
        onError("Failed to load script answers.");
      }
    }
    fetchData();
  }, []);

  if (selected) {
    return (
      <ScriptGrading
        scriptAnswer={selected}
        onClose={() => {
          async function setData() {
            try {
              const data = await ScriptAnswerService.getAllScriptAnswers();
              setScriptAnswers(data);
            } catch (error) {
              onError("Failed to load script answers.");
            }
          }
          setData().then(() => {
            setSelected(null);
          });
        }}
      />
    );
  }

  return (
    <div>
      <h1 data-testid="grading-page-title">Grade Scripts</h1>
      <ScriptAnswerGrid
        scriptAnswers={scriptAnswers}
        onSelect={(sa) => setSelected(sa)}
      />
    </div>
  );
}
