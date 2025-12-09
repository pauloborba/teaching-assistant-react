import { useState } from "react";
import "./CorrectionButton.css";
import CorrectionService from "../../services/CorrectionService";
import CustomButton from "../CustomButton";
import Alert from "../Alert";

interface CorrectionButtonProps {
    students?: any[];
    exam?: any;
    label: string;
    isActive?: boolean;
    selectedExam?: string;
    className?: string;
    onFinished: (data: any) => Promise<void>;
}

export default function CorrectionButton({ students, exam, label, isActive, selectedExam, className = '', onFinished }: CorrectionButtonProps) {
  
  // 🔥 hover ativo só quando condição é true
  const hoverClass = isActive ? '' : 'no-hover';

  // 🔥 cor muda dinamicamente
  const appliedColor = isActive ? undefined : "#cccccc";

  const [alertConfig, setAlertConfig] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });

  const handleCloseAlert = () => {
    setAlertConfig((prev) => ({ ...prev, open: false }));
  };

  const handleCorrectExam = async () => {
    if (!exam || !students) return;

    try {
      console.log("Corrigindo provas...");
      await CorrectionService.correctAllExams(students, exam);

      setAlertConfig({ open: true, message: "Provas corrigidas com sucesso!", severity: "success" });

      await onFinished(selectedExam);
    } catch (err) {
      console.error("Erro ao corrigir provas:", err);
      setAlertConfig({
        open: true,
        message: err instanceof Error ? err.message : "Erro desconhecido ao corrigir provas",
        severity: "error",
      });
    }
  };

  return (
    <>
      <CustomButton
        label={label}
        onClick={isActive ? handleCorrectExam : undefined}
        color={appliedColor}
        className={`${className} ${hoverClass}`}
      />

      <Alert
        message={alertConfig.message}
        severity={alertConfig.severity}
        autoHideDuration={3000}
        open={alertConfig.open}
        onClose={handleCloseAlert}
      />
    </>
  );
}