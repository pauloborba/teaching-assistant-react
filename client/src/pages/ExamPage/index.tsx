import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import CollapsibleTable, {
  Column,
  DetailColumn,
} from "../../components/CollapsibleTable";
import Dropdown from "../../components/DropDown";
import ExamsService from "../../services/ExamsService";
import ModelSelectionModal from "../../components/ModelSelectionModal";
import SuccessModal from "../../components/SuccessModal";
import AICorrectionService from "../../services/AICorrectionService";

import "./ExamPage.css";
import ExamCreatePopup from "./ExamPagePopup";

const columns: Column[] = [
  { id: "studentName", label: "Aluno", align: "left" },
  { id: "examID", label: "ID Prova", align: "right" },
  { id: "qtdAberta", label: "Quantidade Aberta", align: "right" },
  { id: "qtdFechada", label: "Quantidade Fechada", align: "right" },
  { id: "ativo", label: "Ativo", align: "right" },
];

const detailColumns: DetailColumn[] = [
  { id: "idQuestion", label: "ID Questão" },
  { id: "tipoQuestao", label: "Tipo da questão" },
  { id: "textoPergunta", label: "Texto da Pergunta", align: "left" },
];

export default function ExamPage() {
  const { id } = useParams();
  const classID = id;

  const [popupOpen, setPopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);

  const [rows, setRows] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const [selectedExam, setSelectedExam] = useState("Todas as provas");

  // Estados para correção de IA
  const [modelSelectionModalOpen, setModelSelectionModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [correctionResult, setCorrectionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // -------------------------------
  // Carrega provas + tabela (todas)
  // -------------------------------
  const loadAllData = async () => {
    if (!classID) return;

    try {
      setTableLoading(true);

      const [examsResponse, studentsResponse] = await Promise.all([
        ExamsService.getExamsForClass(classID),
        ExamsService.getStudentsWithExamsForClass(classID),
      ]);

      setExams(examsResponse.data || []);
      setRows(studentsResponse.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setExams([]);
      setRows([]);
    } finally {
      setTableLoading(false);
    }
  };

  // carregar automaticamente ao montar
  useEffect(() => {
    loadAllData();
  }, [classID]);

  // ---------------------------------------------------
  // Função auxiliar: pega o ID da prova pela string título
  // ---------------------------------------------------
  const getExamIdByTitle = (title: string): string | undefined => {
    const exam = exams.find((e) => e.title === title);
    return exam ? exam.id.toString() : undefined;
  };

  // -------------------------------------------
  // Filtro via API (carrega somente uma prova)
  // -------------------------------------------
  const handleExamSelect = async (title: string) => {
    setSelectedExam(title);

    if (!classID) return;

    try {
      setTableLoading(true);

      if (title === "Todas as provas") {
        await loadAllData();
        return;
      }

      const examId = getExamIdByTitle(title);
      if (!examId) return;

      const response = await ExamsService.getStudentsWithExamsForClass(
        classID,
        Number(examId)
      );


      setRows(response.data || []);
    } catch (error) {
      console.error("Erro ao filtrar:", error);
    } finally {
      setTableLoading(false);
    }
  };

  // -------------------------------------------
  // Criar prova
  // -------------------------------------------
  const handleCreateExam = async (data: any) => {
    try {
      setLoading(true);

      if (!classID) throw new Error("ID da turma não encontrado");

      if (!data.codProva || !data.nomeProva)
        throw new Error("Código e nome da prova são obrigatórios");

      if (isNaN(parseInt(data.abertas)) || isNaN(parseInt(data.fechadas)))
        throw new Error("Quantidades inválidas");

      const result = await ExamsService.createAndGenerateExams(data, classID);

      alert(`Provas geradas com sucesso! Total: ${result.totalGenerated}`);
      setPopupOpen(false);

      await loadAllData(); // recarrega tudo
    } catch (err) {
      alert(
        `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // Correção de IA
  // -------------------------------------------
  const handleStartAICorrection = () => {
    if (!classID) {
      alert("ID da turma não encontrado");
      return;
    }
    setErrorMessage("");
    setModelSelectionModalOpen(true);
  };

  const handleModelSelect = async (model: string) => {
    // Validação: não permite confirmar sem selecionar um modelo
    if (!model || model === "" || model === "Selecione um modelo") {
      setErrorMessage("Você deve selecionar um modelo de IA para continuar");
      setModelSelectionModalOpen(false);
      return;
    }

    setSelectedModel(model);
    setModelSelectionModalOpen(false);
    setErrorMessage("");

    // Inicia o processo de correção
    try {
      setCorrectionLoading(true);

      if (!classID) {
        throw new Error("ID da turma não encontrado");
      }

      const response = await AICorrectionService.triggerAICorrection(
        classID,
        model
      );

      // Sucesso: mostra modal de sucesso
      setCorrectionResult({
        ...response,
        model: model // Adiciona o modelo selecionado à resposta
      });
      setSuccessModalOpen(true);
    } catch (error) {
      // Erro: mostra mensagem de erro
      const errorMsg = error instanceof Error 
        ? error.message 
        : "Erro ao iniciar a correção. Por favor, tente novamente.";
      setErrorMessage("Erro ao iniciar a correção. Por favor, tente novamente.");
      alert("Erro ao iniciar a correção. Por favor, tente novamente.");
    } finally {
      setCorrectionLoading(false);
    }
  };

  // opções do dropdown (somente strings)
  const dropdownOptions = useMemo(() => {
    return ["Todas as provas", ...exams.map((e) => e.title)];
  }, [exams]);

  return (
    <div className="exam-page">
      <Header />

      {/* Controles superiores */}
      <div
        className="top-controls"
        style={{ display: "flex", gap: "15px", alignItems: "center" }}
      >
        {/* ID da turma */}
        <input
          type="text"
          value={classID || ""}
          readOnly
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: `${(classID?.length || 10) + 2}ch`,
            backgroundColor: "#f5f5f5",
          }}
        />

        {/* Dropdown */}
        <Dropdown
          subjects={dropdownOptions}
          onSelect={handleExamSelect}
          initialText={selectedExam}
        />

        {/* Botão de Correção de IA */}
        <CustomButton
          label="Corrigir com IA"
          onClick={handleStartAICorrection}
          disabled={correctionLoading || !classID}
        />

        {/* Botão alinhado à direita */}
        <div style={{ marginLeft: "auto" }}>
          <CustomButton
            label="Criar Prova"
            onClick={() => setPopupOpen(true)}
          />
        </div>
      </div>

      {/* Mensagem de erro de validação */}
      {errorMessage && (
        <div
          style={{
            padding: "12px",
            margin: "10px 0",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "6px",
            color: "#c33",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* TABELA */}
      {tableLoading ? (
        <p style={{ padding: "20px", textAlign: "center" }}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={{ padding: "20px", textAlign: "center" }}>
          Nenhuma prova encontrada.
        </p>
      ) : (
        <CollapsibleTable
          columns={columns}
          detailColumns={detailColumns}
          rows={rows}
          detailTitle="Questões"
          computeDetailRow={(detail) => ({
            ...detail,
            total: detail.tipoQuestao === "Aberta" ? 2 : 1,
          })}
        />
      )}

      {/* POPUP Criar Prova */}
      <ExamCreatePopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSubmit={handleCreateExam}
        loading={loading}
      />

      {/* Modal de Seleção de Modelo */}
      <ModelSelectionModal
        isOpen={modelSelectionModalOpen}
        onClose={() => {
          setModelSelectionModalOpen(false);
          setErrorMessage("");
        }}
        onSelect={handleModelSelect}
        selectedModel={selectedModel}
      />

      {/* Modal de Sucesso */}
      {correctionResult && (
        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => {
            setSuccessModalOpen(false);
            setCorrectionResult(null);
          }}
          model={correctionResult.model || selectedModel}
          estimatedTime={correctionResult.estimatedTime || ""}
          totalStudentExams={correctionResult.totalStudentExams || 0}
          totalOpenQuestions={correctionResult.totalOpenQuestions || 0}
          queuedMessages={correctionResult.queuedMessages || 0}
        />
      )}
    </div>
  );
}
