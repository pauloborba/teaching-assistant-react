import React, { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import QuestionService from "../../services/QuestionService";
import { Question } from "../../types/Question";
import "./ExamCreatePopup.css";

interface ExamCreatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function ExamCreatePopup({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: ExamCreatePopupProps) {
  const [form, setForm] = useState({
    nomeProva: "",
    abertas: "",
    fechadas: "",
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Fetch questions when popup opens
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen]);

  const loadQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const data = await QuestionService.getAllQuestions();
      setQuestions(data);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleQuestionToggle = (questionId: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSubmit = () => {
    const selectedQuestionsArray = Array.from(selectedQuestions);
    onSubmit({
      ...form,
      questionIds: selectedQuestionsArray,
    });
    // Reset form
    setForm({ nomeProva: "", abertas: "", fechadas: "" });
    setSelectedQuestions(new Set());
  };

  // Count selected questions by type
  const selectedOpenCount = questions.filter(
    (q) => q.type === "open" && selectedQuestions.has(q.id)
  ).length;
  const selectedClosedCount = questions.filter(
    (q) => q.type === "closed" && selectedQuestions.has(q.id)
  ).length;

  // Update form with selected question counts
  useEffect(() => {
    setForm((prevForm) => ({
      ...prevForm,
      abertas: selectedOpenCount.toString(),
      fechadas: selectedClosedCount.toString(),
    }));
  }, [selectedOpenCount, selectedClosedCount]);

  return (
    <Modal title="Criar Prova" isOpen={isOpen} onClose={onClose}>
      <div className="popup-form" data-testid="exam-popup">
        {/* Nome Prova */}
        <label>
          Nome da Prova
          <input
            type="text"
            name="nomeProva"
            value={form.nomeProva}
            onChange={handleChange}
            data-testid="exam-title"
          />
        </label>

        {/* Questions Selection */}
        <div className="questions-section">
          <h3>
            Selecionar Questões ({selectedQuestions.size} selecionadas: {selectedOpenCount} abertas, {selectedClosedCount} fechadas)
          </h3>

          {loadingQuestions ? (
            <p>Carregando questões...</p>
          ) : (
            <div className="questions-list">
              {questions.map((question) => (
                <div key={question.id} className="question-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question.id)}
                      onChange={() => handleQuestionToggle(question.id)}
                      data-testid={`question-checkbox-${question.id}`}
                    />
                    <span className="question-info">
                      <strong>ID {question.id}</strong> - {question.type === "open" ? "Aberta" : "Fechada"} - {question.topic}
                      <br />
                      <span className="question-text">{question.question}</span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <CustomButton
          label={loading ? "Gerando..." : "CRIAR PROVA"}
          onClick={handleSubmit}
          disabled={loading || selectedQuestions.size === 0}
          data-testid="confirm-create-exam"
        />
      </div>
    </Modal>
  );
}
