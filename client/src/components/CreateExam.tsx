import React, { useEffect, useState } from 'react';

import { Question } from '../types/Question';
import { questionService } from '../services/QuestionService';
import { examService } from '../services/ExamService';

type Feedback = {
    type: 'success' | 'error';
    message: string;
}

// Facilita pesquisas sem diferenciar acentos e maiúsculas
function normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const CreateExam: React.FC = () => {
    // Dados recebidos do backend
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado da pesquisa e da seleção
    const [subjectFilter, setSubjectFilter] = useState('');
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [expandedCodes, setExpandedCodes] = useState<string[]>([]);


    // Dados do formulário
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    // Carrega as questões quando o component é aberto
    useEffect(() => {
        let active = true;

        questionService.getAllQuestions()
            .then(data => {
                if (active) {
                    setQuestions(data);
                }
            })
            .catch(error => {
                if (active) {
                    setFeedback({
                        type: 'error',
                        message: error instanceof Error
                            ? error.message
                            : 'Não foi possível carregar as questões'
                    });
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });
            
        return () => {
            active = false;
        };
    }, []);

    // Assuntos disponíveis, sem repetições
    const subjects = Array.from(
        new Set(questions.map(question => question.subject))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Questões que correspondem ao filtro
    const filteredQuestions = questions.filter(question =>
        normalizeText(question.subject).includes(
            normalizeText(subjectFilter.trim())
        )
    );

    // Recupera os objetos das questões selecionadas,
    // preservando a ordem em que foram adicionadas
    const selectedQuestions = selectedCodes
        .map(code => questions.find(question => question.code === code))
        .filter((question): question is Question => Boolean(question));

    // Descobre quais assuntos a seleção aborda
    const selectedSubjects = Array.from(
        new Set(selectedQuestions.map(question => question.subject))
    );

    // Seleciona uma questão, verificando duplicidade
    const handleSelect = (question: Question) => {
        if (selectedCodes.includes(question.code)) {
            setFeedback({
                type: 'error',
                message: 'A questão ' + question.statement + ' já está selecionada'
            });
            return;
        }

        setSelectedCodes(previous => [...previous, question.code]);
        setFeedback(null);
    };

    const toggleAlternatives = (code: string) => {
        setExpandedCodes(previous =>
            previous.includes(code)
                ? previous.filter(c => c !== code)
                : [...previous, code]
        );
    };

    // Permite retirar uma questão antes de salvar
    const handleRemove = (code: string) => {
        setSelectedCodes(previous =>
            previous.filter(selectedCode => selectedCode !== code)
        );
        setFeedback(null)
    }

    // Finaliza o cadastro da prova
    const handleSave = async(
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (selectedCodes.length === 0) {
            setFeedback({
                type: 'error',
                message: 'Não é possível criar uma prova sem questões'
            });
            return
        }

        if (!name.trim()) {
            setFeedback({
                type: 'error',
                message: 'É preciso definir o nome da prova'
            });
            return;
        }

        setSaving(true);
        setFeedback(null);

        try {
            const createdExam = await examService.createExam({
                name: name.trim(),
                questionCodes: selectedCodes
            });

            // Limpa o formulário somente após o sucesso
            setName('');
            setSelectedCodes([]);

            setFeedback({
                type: 'success',
                message: 'A prova '+ createdExam.name + ' foi criada com sucesso'
            });
        } catch (error) {
            // Mantém a seleção para o professor corrigir o problema
            setFeedback({
                type: 'error',
                message: error instanceof Error
                    ? error.message
                    : 'Não foi possível criar a prova'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="create-exam">
            <h2>Criar prova</h2>

            {feedback && (
                <p
                    role="alert"
                    className={
                        feedback.type === 'success'
                            ? 'exam-feedback-success'
                            : 'exam-feedback-error'
                    }
                >
                    {feedback.message}
                </p>
            )}

            <div className="exam-section">
                <h3>Questões disponíveis</h3>

                <label htmlFor="exam-subject-filter">
                    Filtrar por assunto
                </label>

                <input
                    id="exam-subject-filter"
                    data-testid="exam-subject-filter"
                    type="text"
                    list="exam-subject-options"
                    value={subjectFilter}
                    onChange={event => setSubjectFilter(event.target.value)}
                    placeholder="Digite um assunto ou deixe vazio"
                />

                <datalist id="exam-subject-options">
                    {subjects.map(subject => (
                        <option key={subject} value={subject} />
                    ))}
                </datalist>

                {loading ? (
                    <p>Carregando questões...</p>
                ) : questions.length === 0 ? (
                    <>
                        <p>Não há questões cadastradas. Não é possível criar uma prova.</p>
                        
                        {subjectFilter.trim() && (
                            <p>Não há questões do assunto "{subjectFilter}".</p>
                        )}
                    </>
                ) : filteredQuestions.length === 0 ? (
                    <p>
                        Não há questões do assunto "{subjectFilter}".
                    </p>
                ) : (
                    <ul className="exam-question-list">
                        {filteredQuestions.map(question => (
                            <li
                                key={question.code}
                                className="exam-question-item exam-available-question"
                            >
                                <div className="exam-question-header">
                                    <div className="exam-question-info">
                                        <strong>{question.statement}</strong>

                                        <p>Assunto: {question.subject}</p>

                                        {selectedCodes.includes(question.code) && (
                                            <span className="exam-selected-label">
                                                Já selecionada
                                            </span>
                                        )}
                                    </div>
                                    
                                    disabled={saving}
                                    <button
                                        type="button"
                                        data-testid={`select-question-${question.code}`}
                                        onClick={() => handleSelect(question)}
                                        aria-pressed={
                                            selectedCodes.includes(question.code)
                                        }
                                    >
                                        Selecionar
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="exam-toggle-alternatives"
                                    data-testid={`view-alternatives-${question.code}`}
                                    aria-expanded={
                                        expandedCodes.includes(question.code)
                                    }
                                    onClick={() => toggleAlternatives(question.code)}
                                >
                                    <span aria-hidden="true">
                                        {expandedCodes.includes(question.code)
                                            ? '▴'
                                            : '▾'}
                                    </span>

                                    {expandedCodes.includes(question.code)
                                        ? 'Ocultar alternativas'
                                        : 'Ver alternativas'}

                                    {' '}({question.alternatives.length})
                                </button>

                                {expandedCodes.includes(question.code) && (
                                    <ul className="exam-alternatives-preview">
                                        {question.alternatives.map((alternative, index) => (
                                            <li
                                                key={index}
                                                className={
                                                    alternative.isTrue
                                                        ? 'exam-alternative-true'
                                                        : 'exam-alternative-false'
                                                }
                                            >
                                                <span className="exam-alternative-letter">
                                                    {String.fromCharCode(65 + index)}.
                                                </span>

                                                <span className="exam-alternative-text">
                                                    {alternative.text}
                                                </span>

                                                <span className="exam-alternative-classification">
                                                    {alternative.isTrue
                                                        ? '✓ Verdadeira'
                                                        : '× Falsa'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="exam-section">
                <h3>
                    Questões selecionadas ({selectedQuestions.length})
                </h3>

                {selectedQuestions.length === 0 ? (
                    <p>Nenhuma questão selecionada.</p>
                ) : (
                    <>
                        <p>
                            <strong>Assuntos abordados:</strong>{' '}
                            {selectedSubjects.join(', ')}
                        </p>

                        <ol className="exam-question-list">
                            {selectedQuestions.map(question => (
                                <li
                                    key={question.code}
                                    className="exam-question-item"
                                >
                                    <div>
                                        <strong>{question.statement}</strong>
                                        <p>Assunto: {question.subject}</p>
                                    </div>
                                    disabled={saving}
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(question.code)}
                                    >
                                        Remover
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </div>

            <form onSubmit={handleSave} className="exam-section">
                <h3>Finalizar prova</h3>

                <label htmlFor="exam-name">Nome da prova</label>
                disabled={saving}
                <input
                    id="exam-name"
                    data-testid="exam-name"
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Ex.: Prova de Engenharia de Software"
                />

                <button
                    type="submit"
                    data-testid="save-exam"
                    disabled={saving || loading}
                >
                    {saving ? 'Salvando...' : 'Salvar prova'}
                </button>
            </form>
        </section>
    );
};

export default CreateExam;
