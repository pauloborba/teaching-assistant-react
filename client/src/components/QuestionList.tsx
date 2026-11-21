import React from 'react';
import { Question } from '../types/Question';

interface QuestionListProps {
    questions: Question[];
    loading: boolean;
}

const QuestionList: React.FC<QuestionListProps> = ({
    questions,
    loading
}) => {
    if (loading) {
        return <p>Carregando questões...</p>;
    }

    return (
        <section className="students-list questions-list">
            <h2>Questões cadastradas ({questions.length})</h2>

            {questions.length == 0 ? (
                <p className="no-students">
                    Nenhuma questão cadastrada.
                </p> 
            ) : (
                <div className="question-items">
                    {questions.map(question => (
                        <article key={question.code} className="question-card">
                            <h3>{question.subject}</h3>
                            <p>{question.statement}</p>
                            
                            <ul>
                                {question.alternatives.map((alternative, index) => (
                                    <li key={index}>
                                        {alternative.text} -{' '} 
                                        {alternative.isTrue ? 'Verdadeira' : 'Falsa'}
                                    </li>
                                ))}
                            </ul>3
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};

export default QuestionList;