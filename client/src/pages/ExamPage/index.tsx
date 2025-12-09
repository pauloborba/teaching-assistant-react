import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import CollapsibleTable, { Column, DetailColumn } from "../../components/CollapsibleTable";
import Alert from "../../components/Alert";
import Dropdown from "../../components/DropDown";
import ExamsService from "../../services/ExamsService";
import ModelSelectionModal from "../../components/ModelSelectionModal";
import SuccessModal from "../../components/SuccessModal";
import CorrectionsViewModal from "../../components/CorrectionsViewModal";
import AICorrectionService from "../../services/AICorrectionService";
import CorrectionService from "../../services/CorrectionService";
import QuestionService from "../../services/QuestionService";
import { Button } from "@mui/material";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { GeneratePDFButton } from "../../components/GeneratePDFButton";
import "./ExamPage.css";
import ExamCreatePopup from "./ExamPagePopup";

const columns: Column[] = [
  { id: "genId", label: "Geração ID", align: "left" },
  { id: "numVersions", label: "Nº Versões", align: "right" },
  { id: "generationDate", label: "Data de Geração", align: "left" },
  { id: "numQuestionsOpen", label: "Nº Questões Abertas", align: "right" },
  { id: "numQuestionsClosed", label: "Nº Questões Fechadas", align: "right" },
];

const detailColumns: DetailColumn[] = [
  { id: "questionId", label: "ID Questão" },
  { id: "type", label: "Tipo" },
  { id: "questionText", label: "Texto da Questão", align: "left" },
];

export default function ExamPage() {
  const { id } = useParams();
  const classID = id;

  const [popupOpen, setPopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [correctionActive, setCorrectionActive] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const [selectedExam, setSelectedExam] = useState("Todas as provas");

  // Estados para correção de IA
  const [modelSelectionModalOpen, setModelSelectionModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [correctionResult, setCorrectionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Estados para PDF
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedExamIdForPdf, setSelectedExamIdForPdf] = useState<string | null>(null);

  // Visualização de correções
  const [correctionsViewModalOpen, setCorrectionsViewModalOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });

  const handleCloseAlert = () => {
    setAlertConfig((prev) => ({ ...prev, open: false }));
  };

  const transformGenerationsToRows = async (generations: any[], examsData: any[], examIdFilter?: number) => {
    const rows: any[] = [];

    for (const gen of generations) {
      if (examIdFilter && gen.examId !== examIdFilter) continue;

      const generationDate = new Date(gen.timestamp).toLocaleString('pt-BR');

      // Fetch exam data to get the defined question counts
      let numOpen = 0;
      let numClosed = 0;
      try {
        const examData = examsData.find(e => e.id === gen.examId);
        if (examData) {
          numOpen = examData.openQuestions || 0;
          numClosed = examData.closedQuestions || 0;
        }
      } catch (e) {
        console.error(`Failed to fetch exam data for exam ${gen.examId}`, e);
      }

      // Collect unique questions from all versions in this generation
      const questionMap = new Map();

      for (const version of (gen.versions || [])) {
        for (const q of (version.questions || [])) {
          // Only fetch question text once per unique question ID
          if (!questionMap.has(q.questionId)) {
            let questionText = 'Carregando...';
            try {
              const questionData = await QuestionService.getQuestionById(q.questionId);
              questionText = questionData?.question || 'Não disponível';
            } catch (e) {
              console.error(`Failed to fetch question ${q.questionId}`, e);
              questionText = 'Erro ao carregar';
            }

            questionMap.set(q.questionId, {
              questionId: q.questionId,
              type: q.type === 'open' ? 'Aberta' : 'Fechada',
              questionText: questionText
            });
          }
        }
      }

      rows.push({
        genId: gen.id,
        numVersions: gen.versions?.length || 0,
        generationDate: generationDate,
        numQuestionsOpen: numOpen,
        numQuestionsClosed: numClosed,
        details: Array.from(questionMap.values())
      });
    }

    return rows;
  };

  const loadAllData = useCallback(async () => {
    if (!classID) return;

    try {
      setTableLoading(true);

      const [examsResponse, studentsResponse] = await Promise.all([
        ExamsService.getExamsForClass(classID),
        ExamsService.getStudentsWithExamsForClass(classID)
      ]);
      setExams(examsResponse.data || []);

      if (studentsResponse.data && Array.isArray(studentsResponse.data)) {
        const uniqueStudents = new Set(studentsResponse.data.map((s: any) => s.studentName));
        setTotalStudents(uniqueStudents.size);
      }
      // Fetch all generations for all exams in the class
      const allGenerations: any[] = [];
      for (const exam of (examsResponse.data || [])) {
        try {
          const gens = await ExamsService.getGenerations(exam.id, classID);
          if (Array.isArray(gens)) {
            allGenerations.push(...gens);
          }
        } catch (e) {
          console.error(`Failed to fetch generations for exam ${exam.id}`, e);
        }
      }

      const transformedRows = await transformGenerationsToRows(allGenerations, examsResponse.data || []);
      setRows(transformedRows);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setExams([]);
      setRows([]);
    } finally {
      setTableLoading(false);
    }
  }, [classID]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const getExamIdByTitle = (title: string): string | undefined => {
    const exam = exams.find((e) => e.title === title);
    return exam ? exam.id.toString() : undefined;
  };

  const handleExamSelect = async (title: string) => {
    setSelectedExam(title);
    if (title === "Todas as provas") {
      setCorrectionActive(false);
    } else {
      setCorrectionActive(true);
    }

    if (!classID) return;

    try {
      setTableLoading(true);

      if (title === "Todas as provas") {
        await loadAllData();
        return;
      }

      const examId = getExamIdByTitle(title);
      if (!examId) return;

      // Fetch generations for the specific exam
      const gens = await ExamsService.getGenerations(Number(examId), classID);
      const transformedRows = await transformGenerationsToRows(gens, exams, Number(examId));
      setRows(transformedRows);
    } catch (error) {
      console.error("Erro ao filtrar:", error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleOpenPdfDialog = () => {
    const examId = getExamIdByTitle(selectedExam);

    if (examId) {
      setSelectedExamIdForPdf(examId);
      setPdfDialogOpen(true);
    } else {
      setAlertConfig({
        open: true,
        message: "Selecione uma prova específica para gerar o PDF.",
        severity: "warning"
      });
    }
  };

  const handleCreateExam = async (data: any) => {
    try {
      setLoading(true);

      if (!classID) throw new Error("ID da turma não encontrado");

      if (!data.nomeProva)
        throw new Error("Nome da prova é obrigatório");

      if (isNaN(parseInt(data.abertas)) || isNaN(parseInt(data.fechadas)))
        throw new Error("Quantidades inválidas");

      await ExamsService.createExams(data, classID);

      setAlertConfig({
        open: true,
        message: `Provas geradas com sucesso!`,
        severity: "success",
      });

      setPopupOpen(false);

      await loadAllData();

      // Select the newly created exam
      setSelectedExam(data.nomeProva);
    } catch (err) {
      setAlertConfig({
        open: true,
        message:
          err instanceof Error ? err.message : "Erro desconhecido ao criar prova",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // Deletar prova
  // -------------------------------------------
  const handleDeleteExam = async () => {
    if (!classID) return;

    const examId = getExamIdByTitle(selectedExam);
    if (!examId) return;

    // Confirmação antes de deletar
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar a prova "${selectedExam}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await ExamsService.deleteExam(Number(examId), classID);

      setAlertConfig({
        open: true,
        message: `Prova "${selectedExam}" deletada com sucesso!`,
        severity: "success",
      });

      // Resetar para "Todas as provas" e recarregar
      setSelectedExam("Todas as provas");
      await loadAllData();
    } catch (err) {
      setAlertConfig({
        open: true,
        message:
          err instanceof Error ? err.message : "Erro ao deletar prova",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // Correção de IA (Abertas)
  // -------------------------------------------
  const handleStartAICorrection = () => {
    if (selectedExam === "Todas as provas") {
      setAlertConfig({
        open: true,
        message: "Selecione uma prova específica para corrigir questões abertas.",
        severity: "warning"
      });
      return;
    }

    const examId = getExamIdByTitle(selectedExam);
    if (!examId) {
      setAlertConfig({
        open: true,
        message: "Prova não encontrada.",
        severity: "error"
      });
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

      const examId = getExamIdByTitle(selectedExam);
      if (!examId) {
        throw new Error("Prova não encontrada");
      }

      const response = await AICorrectionService.triggerAICorrection(
        Number(examId),
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
      setErrorMessage(errorMsg);
      setAlertConfig({
        open: true,
        message: errorMsg,
        severity: "error"
      });
    } finally {
      setCorrectionLoading(false);
    }
  };

  // -------------------------------------------
  // Visualizar Correções
  // -------------------------------------------
  const handleViewCorrections = () => {
    if (selectedExam === "Todas as provas") {
      setAlertConfig({
        open: true,
        message: "Selecione uma prova específica para visualizar correções.",
        severity: "warning"
      });
      return;
    }

    const examId = getExamIdByTitle(selectedExam);
    if (!examId) {
      setAlertConfig({
        open: true,
        message: "Prova não encontrada.",
        severity: "error"
      });
      return;
    }

    setCorrectionsViewModalOpen(true);
  };

  // -------------------------------------------
  // Correção de Fechadas
  // -------------------------------------------
  const handleCorrectClosedQuestions = async () => {
    if (selectedExam === "Todas as provas") {
      setAlertConfig({
        open: true,
        message: "Selecione uma prova específica para corrigir questões fechadas.",
        severity: "warning"
      });
      return;
    }

    const examId = getExamIdByTitle(selectedExam);
    if (!examId || !classID) {
      setAlertConfig({
        open: true,
        message: "Dados insuficientes para corrigir.",
        severity: "error"
      });
      return;
    }

    try {
      setLoading(true);

      // Busca os dados da prova
      const examData = exams.find((e) => e.id.toString() === examId);
      if (!examData) {
        throw new Error("Prova não encontrada");
      }

      // Garante que o examData tenha a estrutura correta para o CorrectionService
      const examForCorrection = {
        id: examData.id.toString(),
        title: examData.title || selectedExam,
        date: examData.date || '',
        durationMinutes: examData.durationMinutes || 0
      };

      // Busca os estudantes com exames para esta prova
      const studentsResponse = await ExamsService.getStudentsWithExamsForClass(
        classID,
        Number(examId)
      );

      // A API retorna { data: [...] } ou array direto
      const studentsData = studentsResponse?.data || studentsResponse;

      if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
        setAlertConfig({
          open: true,
          message: "Nenhum estudante encontrado para esta prova.",
          severity: "warning"
        });
        return;
      }

      // Converte para o formato esperado pelo CorrectionService (Student interface)
      const students = studentsData.map((s: any) => ({
        cpf: s.cpf || s.studentCPF,
        name: s.studentName || s.name || '',
        email: s.email || s.studentEmail || ''
      }));

      // Usa o CorrectionService para corrigir questões fechadas
      await CorrectionService.correctAllStudentsInExam(examForCorrection.id);

      setAlertConfig({
        open: true,
        message: "Questões fechadas corrigidas com sucesso!",
        severity: "success"
      });

      // Recarrega os dados
      await handleExamSelect(selectedExam);
    } catch (err) {
      setAlertConfig({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao corrigir questões fechadas",
        severity: "error"
      });
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
      <div className="top-controls">
        <div className="top-left">
          <div className="top-left-row">
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

            <Dropdown
              subjects={dropdownOptions}
              onSelect={handleExamSelect}
              initialText={selectedExam}
              data-testid="exam-dropdown"
            />
          </div>

          {selectedExam !== "Todas as provas" && (
            <div className="top-left-row">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FileDownloadIcon />}
                onClick={handleOpenPdfDialog}
                style={{ height: "40px", textTransform: "none" }}
              >
                Gerar Lote
              </Button>
            </div>
          )}
        </div>

        <div className="top-right">
          {selectedExam !== "Todas as provas" ? (
            <>
              <div className="top-right-row">
                <CustomButton
                  label="Corrigir Fechadas"
                  onClick={handleCorrectClosedQuestions}
                  disabled={loading || !correctionActive}
                  style={{
                    backgroundColor: correctionActive ? undefined : "#cccccc",
                  }}
                />
                <CustomButton
                  label="Corrigir Abertas"
                  onClick={handleStartAICorrection}
                  disabled={correctionLoading || !correctionActive}
                  data-testid="correct-open-questions-button"
                  style={{
                    backgroundColor: correctionActive ? undefined : "#cccccc",
                  }}
                />
                <CustomButton
                  label="Visualizar Correções"
                  onClick={handleViewCorrections}
                  disabled={loading}
                  style={{
                    backgroundColor: "#17a2b8",
                    color: "white",
                  }}
                />
              </div>
              <div className="top-right-row">
                <CustomButton
                  label="Deletar Prova"
                  onClick={handleDeleteExam}
                  data-testid="delete-exam-button"
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                  }}
                  disabled={loading}
                />
                <CustomButton
                  label="Criar Prova"
                  onClick={() => setPopupOpen(true)}
                  data-testid="open-create-exam"
                />
              </div>
            </>
          ) : (
            <div className="top-right-row">
              <CustomButton
                label="Criar Prova"
                onClick={() => setPopupOpen(true)}
                data-testid="open-create-exam"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mensagem de erro de validação */}
      {errorMessage && (
        <div
          data-testid="error-message"
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
          Nenhuma geração de prova encontrada.
        </p>
      ) : (
        <CollapsibleTable
          data-testid="exam-table"
          columns={columns}
          detailColumns={detailColumns}
          rows={rows}
          detailTitle="Questões da Versão"
          computeDetailRow={(detail) => detail}
          correctionActive={correctionActive}
          onCorrectionFinished={handleExamSelect}
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
          totalStudentExams={correctionResult.totalResponses || 0}
          totalOpenQuestions={correctionResult.totalOpenQuestions || 0}
          queuedMessages={correctionResult.queuedMessages || 0}
        />
      )}

      {classID && (
        <GeneratePDFButton
          open={pdfDialogOpen}
          onClose={() => setPdfDialogOpen(false)}
          examId={selectedExamIdForPdf}
          classId={classID}
          defaultQuantity={totalStudents > 0 ? totalStudents : 30}
          onSuccess={loadAllData}
        />
      )}

      {/* Modal de Visualização de Correções */}
      <CorrectionsViewModal
        isOpen={correctionsViewModalOpen}
        onClose={() => setCorrectionsViewModalOpen(false)}
        examId={selectedExam !== "Todas as provas" ? Number(getExamIdByTitle(selectedExam) || 0) : null}
      />

      <Alert //Alerta para criação da prova com exito ou não
        data-testid={alertConfig.severity === "success" ? "alert-success" : "alert-error"}
        message={alertConfig.message}
        severity={alertConfig.severity}
        autoHideDuration={3000}
        open={alertConfig.open}
        onClose={handleCloseAlert}
      />
    </div>
  );
}
