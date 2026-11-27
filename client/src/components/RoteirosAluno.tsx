import React from 'react';
import { RoteiroDoAluno, SituacaoRoteiro, SITUACAO_LABEL } from '../types/RoteiroDoAluno';

interface RoteirosAlunoProps {
  roteiros: RoteiroDoAluno[];
  loading: boolean;
}

// Ordem em que as situações aparecem na tabela (menor número aparece primeiro)
const ORDEM_SITUACAO: Record<SituacaoRoteiro, number> = {
  nao_iniciado: 1,
  em_andamento: 2,
  enviado: 3,
  respondido: 4,
  prazo_encerrado: 5,
  ainda_nao_aberto: 6
};

const formatarData = (iso: string): string => {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR');
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
};

const ordenarPorSituacao = (a: RoteiroDoAluno, b: RoteiroDoAluno): number =>
  ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] ||
  a.prazoEntrega.localeCompare(b.prazoEntrega);

const RoteirosAluno: React.FC<RoteirosAlunoProps> = ({ roteiros, loading }) => {
  const disponiveis = roteiros
    .filter(r => r.situacao !== 'ainda_nao_aberto')
    .sort(ordenarPorSituacao);

  if (loading) {
    return (
      <div className="roteiros-list">
        <h2>Roteiros</h2>
        <div className="loading">Carregando roteiros...</div>
      </div>
    );
  }

  return (
    <div className="roteiros-list" data-testid="roteiros-aluno">
      <h2>Roteiros ({disponiveis.length})</h2>

      {disponiveis.length === 0 ? (
        <div className="no-roteiros">
          Nenhum roteiro disponível para responder no momento.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Roteiro</th>
                <th>Turma</th>
                <th>Progresso</th>
                <th>Prazo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {disponiveis.map(roteiro => (
                <tr key={roteiro.id} data-testid={`roteiro-row-${roteiro.id}`}>
                  <td>
                    <div className="roteiro-titulo">{roteiro.titulo}</div>
                    {roteiro.descricao && (
                      <div className="roteiro-descricao">{roteiro.descricao}</div>
                    )}
                  </td>
                  <td>{roteiro.turma}</td>
                  <td className="roteiro-nowrap">{roteiro.questoesRespondidas}/{roteiro.totalQuestoes} questões</td>
                  <td className="roteiro-nowrap">{formatarData(roteiro.prazoEntrega)}</td>
                  <td>
                    <span className={`situacao-badge situacao-${roteiro.situacao}`}>
                      {SITUACAO_LABEL[roteiro.situacao]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoteirosAluno;