import React, { useState } from 'react';
import { Class } from '../types/Class';
import Roteiros from './Roteiros';
import ResponseTimeReport from './ResponseTimeReport';
import RelatorioRoteiro from './RelatorioRoteiro';
import './Roteiros.css';

interface RoteirosPainelProps {
  turmas: Class[];
  onError?: (message: string) => void;
}

type RoteirosSubAba = 'cadastro' | 'desempenho' | 'correlacao';

// Aba "Roteiros" do professor, com sub-abas para o cadastro e os relatórios
const RoteirosPainel: React.FC<RoteirosPainelProps> = ({ turmas, onError }) => {
  const [subAba, setSubAba] = useState<RoteirosSubAba>('cadastro');

  const abas: { id: RoteirosSubAba; label: string }[] = [
    { id: 'cadastro', label: 'Cadastro e acompanhamento' },
    { id: 'desempenho', label: 'Relatório de desempenho' },
    { id: 'correlacao', label: 'Relatório de correlação' },
  ];

  return (
    <div className="roteiros-painel">
      <div className="roteiros-subabas">
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={`roteiros-subaba ${subAba === aba.id ? 'active' : ''}`}
            onClick={() => setSubAba(aba.id)}
            data-testid={`roteiros-subaba-${aba.id}`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {subAba === 'cadastro' && <Roteiros turmas={turmas} onError={onError} />}

      {subAba === 'desempenho' && <RelatorioRoteiro classes={turmas} />}
      {subAba === 'correlacao' && <ResponseTimeReport turmas={turmas} />}
    </div>
  );
};

export default RoteirosPainel;
