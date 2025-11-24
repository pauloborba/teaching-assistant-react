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

        {/* Botão alinhado à direita */}
        <div style={{ marginLeft: "auto" }}>
          <CustomButton
            label="Criar Prova"
            onClick={() => setPopupOpen(true)}
          />
        </div>
      </div>

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

      {/* POPUP */}
      <ExamCreatePopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSubmit={handleCreateExam}
        loading={loading}
      />
    </div>
  );
}
