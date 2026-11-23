import React, { useState } from 'react';
import { Question } from '../types/Question';
import './QuestionList.css';

interface QuestionListProps {
    questions: Question[];
    loading: boolean;
}

// Permite pesquisar sem diferenciar acentos ou maiúsculas.
function normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const QuestionList: React.FC<QuestionListProps> = ({ questions, loading }) => {
    const [search, setSearch] = useState('');

    const query = normalizeText(search.trim());
    // A numeração acompanha a posição no banco, mesmo após filtrar.
    const visibleQuestions = questions
        .map((question, index) => ({ question, number: index + 1 }))
        .filter(({ question }) =>
            normalizeText(question.subject).includes(query) ||
            normalizeText(question.statement).includes(query)
        );

    if (loading) {
        return <p>Carregando questões...</p>;
    }

    return (
        <section className="students-list questions-list question-list-modern">
            <header className="ql-header">
                <span className="ql-kicker">Banco de questões</span>
                <h2>Questões cadastradas ({questions.length})</h2>
                <p>Consulte os enunciados e as alternativas das questões.</p>
            </header>

            {questions.length === 0 ? (
                <p className="no-students ql-empty">Nenhuma questão cadastrada.</p>
            ) : (
                <div className="ql-body">
                    <div className="ql-search">
                        <label htmlFor="question-list-search">Pesquisar questões</label>
                        <div className="ql-search-row">
                            <svg className="ql-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <circle cx="10.5" cy="10.5" r="6.5" />
                                <path d="m15.5 15.5 5 5" strokeLinecap="round" />
                            </svg>
                            <input
                                id="question-list-search"
                                data-testid="question-list-search"
                                type="search"
                                placeholder="Pesquisar por assunto ou enunciado..."
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                            />
                            {search && (
                                <button type="button" onClick={() => setSearch('')} className="ql-clear">
                                    Limpar
                                </button>
                            )}
                        </div>
                        {query && (
                            <p className="ql-results" aria-live="polite">
                                {visibleQuestions.length} de {questions.length} questões encontradas
                            </p>
                        )}
                    </div>

                    {visibleQuestions.length === 0 ? (
                        <p className="ql-empty">Nenhuma questão corresponde à pesquisa.</p>
                    ) : (
                        <div className="question-items">
                            {visibleQuestions.map(({ question, number }) => (
                                <article key={question.code} className="question-card">
                                    <header className="ql-card-header">
                                        <span className="ql-number">
                                            Questão {String(number).padStart(2, '0')}
                                        </span>
                                        <h3 className="ql-subject">{question.subject}</h3>
                                    </header>

                                    <p className="ql-statement">{question.statement}</p>
                                    <h4 className="ql-alternatives-title">Alternativas</h4>

                                    <ul className="ql-alternatives">
                                        {question.alternatives.map((alternative, index) => (
                                            <li
                                                key={index}
                                                className={`ql-alternative ${alternative.isTrue ? 'ql-true' : 'ql-false'}`}
                                            >
                                                <span className="ql-alternative-text">{alternative.text}</span>
                                                <span className="ql-separator" aria-hidden="true">{' - '}</span>
                                                <span className="ql-classification">
                                                    {alternative.isTrue ? 'Verdadeira' : 'Falsa'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <footer className="ql-card-footer">
                                        <span className="ql-footer-count">
                                            {question.alternatives.length} {question.alternatives.length === 1 ? 'alternativa' : 'alternativas'}
                                        </span>
                                    </footer>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default QuestionList;
