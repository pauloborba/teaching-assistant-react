import React, { useEffect, useRef, useState } from 'react';
import { Class } from '../types/Class';

interface TurmasSelectProps {
  turmas: Class[];
  selecionadas: string[]; // ids das turmas (topic-year-semester)
  onChange: (turmaIds: string[]) => void;
}

// Nome da turma exibido ao professor, ex.: "Engenharia de Software e Sistemas - 2026.2"
export const nomeDaTurma = (turma: Class): string =>
  `${turma.topic} - ${turma.year}.${turma.semester}`;

// Caixa de seleção com várias turmas (lista de checkboxes que abre ao clicar)
const TurmasSelect: React.FC<TurmasSelectProps> = ({ turmas, selecionadas, onChange }) => {
  const [aberto, setAberto] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha a lista ao clicar fora dela
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const alternarTurma = (turmaId: string) => {
    onChange(
      selecionadas.includes(turmaId)
        ? selecionadas.filter((id) => id !== turmaId)
        : [...selecionadas, turmaId]
    );
  };

  const resumo =
    selecionadas.length === 0
      ? 'Selecione as turmas'
      : turmas
          .filter((t) => selecionadas.includes(t.id))
          .map(nomeDaTurma)
          .join('; ');

  return (
    <div className="turmas-select" ref={containerRef}>
      <button
        type="button"
        id="roteiro-turmas"
        className="turmas-select-trigger"
        onClick={() => setAberto(!aberto)}
        data-testid="roteiro-turmas-select"
      >
        <span className="turmas-select-resumo">{resumo}</span>
        <span className="turmas-select-seta">▾</span>
      </button>

      {aberto && (
        <div className="turmas-select-opcoes" data-testid="roteiro-turmas-opcoes">
          {turmas.length === 0 ? (
            <p className="turmas-select-vazio">Nenhuma turma cadastrada.</p>
          ) : (
            turmas.map((turma) => (
              <label key={turma.id} className="turmas-select-opcao">
                <input
                  type="checkbox"
                  checked={selecionadas.includes(turma.id)}
                  onChange={() => alternarTurma(turma.id)}
                  data-testid={`roteiro-turma-${turma.id}`}
                />
                {nomeDaTurma(turma)}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TurmasSelect;
