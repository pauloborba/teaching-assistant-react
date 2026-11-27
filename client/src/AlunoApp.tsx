import React, { useState, useEffect, useCallback } from 'react';
import { Student } from './types/Student';
import { RoteiroDoAluno } from './types/Roteiro';
import RoteiroService from './services/RoteiroService';
import LoginAluno from './components/LoginAluno';
import RoteirosAluno from './components/RoteirosAluno';
import './App.css';

type AlunoTabType = 'roteiros';

const ALUNO_STORAGE_KEY = 'teaching-assistant:aluno';

const lerAlunoSalvo = (): Student | null => {
  try {
    const salvo = sessionStorage.getItem(ALUNO_STORAGE_KEY);
    return salvo ? (JSON.parse(salvo) as Student) : null;
  } catch {
    return null;
  }
};


const AlunoApp: React.FC = () => {
  const [aluno, setAluno] = useState<Student | null>(lerAlunoSalvo);
  const [roteiros, setRoteiros] = useState<RoteiroDoAluno[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AlunoTabType>('roteiros');

  const loadRoteiros = useCallback(async (cpf: string) => {
    try {
      setLoading(true);
      setError('');
      const roteirosData = await RoteiroService.getRoteirosDoAluno(cpf);
      setRoteiros(roteirosData);
    } catch (err) {
      setError('Não foi possível carregar os roteiros. Tente novamente.');
      console.error('Error loading roteiros:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (aluno) {
      loadRoteiros(aluno.cpf);
    }
  }, [aluno, loadRoteiros]);

  const handleLogin = (alunoIdentificado: Student) => {
    try {
      sessionStorage.setItem(ALUNO_STORAGE_KEY, JSON.stringify(alunoIdentificado));
    } catch {
      // Sem sessionStorage o aluno só precisa se identificar de novo ao recarregar
    }
    setAluno(alunoIdentificado);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ALUNO_STORAGE_KEY);
    } catch {
      // Nada a fazer
    }
    setAluno(null);
    setRoteiros([]);
    setError('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Teaching Assistant</h1>
        <p>Área do aluno</p>
      </header>

      <main className="App-main">
        {!aluno ? (
          <LoginAluno onLogin={handleLogin} />
        ) : (
          <>
            <div className="aluno-bar" data-testid="aluno-bar">
              <div className="aluno-bar-info">
                <span className="aluno-bar-nome">{aluno.name}</span>
                <span className="aluno-bar-detalhe">{aluno.cpf} · {aluno.email}</span>
              </div>
              <button type="button" onClick={handleLogout} data-testid="logout-button">
                Sair
              </button>
            </div>

            {error && (
              <div className="error-message">
                <strong>Erro:</strong> {error}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'roteiros' ? 'active' : ''}`}
                onClick={() => setActiveTab('roteiros')}
                data-testid="roteiros-tab"
              >
                Roteiros
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'roteiros' && (
                <RoteirosAluno roteiros={roteiros} loading={loading} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AlunoApp;