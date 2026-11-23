import React, { useState } from 'react';

import QuestionsTab from './QuestionsTab';
import CreateExam from './CreateExam';
import ExamList from './ExamList';

type ProvasSection = 'questions' | 'create' | 'history';

const ProvasTab: React.FC = () => {
  const [section, setSection] = useState<ProvasSection>('questions');
  return (
    <div className="provas-container">
      <h2>Provas</h2>
      <nav
        className="exam-navigation"
        aria-label="Seções de provas"
      >
        <button
          type="button"
          className={section === 'questions' ? 'active' : ''}
          onClick={() => setSection('questions')}
        >
          Banco de questões
        </button>

        <button
          type="button"
          className={section === 'create' ? 'active' : ''}
          onClick={() => setSection('create')}
        >
          Criar prova
        </button>

        <button
          type="button"
          className={section === 'history' ? 'active' : ''}
          onClick={() => setSection('history')}
        >
          Provas criadas
        </button>
      </nav>

      {section === 'questions' && <QuestionsTab />}

      {section === 'create' && <CreateExam />}

      {section === 'history' && <ExamList />}
    </div>
  );
};

export default ProvasTab;