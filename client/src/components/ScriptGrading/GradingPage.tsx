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
    setScriptAnswers(ScriptAnswerService.getAllScriptAnswers());
  }, []);

  if (selected) {
    return (
      <ScriptGrading
        scriptAnswer={selected}
        onClose={() => {
          setScriptAnswers(ScriptAnswerService.getAllScriptAnswers());
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div>
      <h1>Grade Scripts</h1>
      <ScriptAnswerGrid
        scriptAnswers={scriptAnswers}
        onSelect={(sa) => setSelected(sa)}
      />
    </div>
  );
}
