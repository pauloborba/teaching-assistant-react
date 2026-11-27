import React, { useState } from 'react';
import { Class } from '../types/Class';
import Roteiros from './Roteiros';
import './Roteiros.css';

interface RoteirosPainelProps {
  turmas: Class[];
  onError?: (message: string) => void;
}

type RoteirosSubAba = 'cadastro' | 'desempenho' | 'comparacao';

// Aba "Roteiros" do professor, com sub-abas para o cadastro e os relatórios
const RoteirosPainel: React.FC<RoteirosPainelProps> = ({ turmas, onError }) => {
  const [subAba, setSubAba] = useState<RoteirosSubAba>('cadastro');

  const abas: { id: RoteirosSubAba; label: string }[] = [
    { id: 'cadastro', label: 'Cadastro e acompanhamento' },
    { id: 'desempenho', label: 'Relatório de desempenho' },
    { id: 'comparacao', label: 'Relatório de comparação' },
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

      {/* Os relatórios entram no merge com as branches de relatório */}
      {subAba === 'desempenho' && (
        <p className="roteiros-empty">O relatório de desempenho será integrado em breve.</p>
      )}
      {subAba === 'comparacao' && (
        <p className="roteiros-empty">O relatório de comparação será integrado em breve.</p>
      )}
    </div>
  );
};

export default RoteirosPainel;
