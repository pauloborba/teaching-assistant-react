import React, { useState } from 'react';
import { QuestaoItem, QuestaoPayload, TIPO_QUESTAO_LABEL } from '../types/Questao';
import { questaoService } from '../services/QuestaoService';
import QuestaoFormModal from './QuestaoFormModal';

interface QuestoesRoteiroModalProps {
  questoes: QuestaoItem[]; // banco de questões
  selecionadasIniciais: string[]; // questaoIds atuais do roteiro
  onConfirmar: (questaoIds: string[]) => void;
  onFechar: () => void;
  onBancoAlterado: () => Promise<void>; // recarrega o banco depois de criar, editar ou remover
}

// Pop-up para escolher as questões de um roteiro e manter o banco de questões
const QuestoesRoteiroModal: React.FC<QuestoesRoteiroModalProps> = ({
  questoes,
  selecionadasIniciais,
  onConfirmar,
  onFechar,
  onBancoAlterado,
}) => {
  const [selecionadas, setSelecionadas] = useState<string[]>(selecionadasIniciais);
  const [busca, setBusca] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  // undefined: formulário fechado; null: nova questão; QuestaoItem: editando
  const [questaoEmEdicao, setQuestaoEmEdicao] = useState<QuestaoItem | null | undefined>(undefined);

  const tituloDa = (id: string) => questoes.find((q) => q.id === id)?.titulo ?? id;

  const termo = busca.trim().toLowerCase();
  const questoesFiltradas = questoes.filter((q) => q.titulo.toLowerCase().includes(termo));

  const adicionar = (id: string) => {
    if (!selecionadas.includes(id)) setSelecionadas([...selecionadas, id]);
  };

  const retirar = (id: string) => {
    setSelecionadas(selecionadas.filter((selecionada) => selecionada !== id));
  };

  const handleSalvarQuestao = async (payload: QuestaoPayload) => {
    if (questaoEmEdicao) {
      await questaoService.updateQuestao(questaoEmEdicao.id, payload);
    } else {
      const nova = await questaoService.createQuestao(payload);
      adicionar(nova.id);
    }
    setQuestaoEmEdicao(undefined);
    await onBancoAlterado();
  };

  const handleRemoverQuestao = async (id: string) => {
    setErro('');
    try {
      await questaoService.deleteQuestao(id);
      retirar(id);
      await onBancoAlterado();
    } catch (err) {
      setErro((err as Error).message || 'Erro ao remover questão');
    }
  };

  return (
    <div className="roteiro-modal-overlay">
      <div className="roteiro-modal roteiro-modal-questoes" data-testid="questoes-roteiro-modal">
        <div className="roteiro-modal-header">
          <h3>Questões do roteiro</h3>
          <button type="button" className="roteiro-modal-fechar" onClick={onFechar} title="Fechar">
            ×
          </button>
        </div>

        <div className="questoes-modal-corpo">
          {/* Questões escolhidas para o roteiro */}
          <div className="questoes-selecionadas">
            <h4>Questões para adicionar a este roteiro</h4>
            {selecionadas.length === 0 ? (
              <p className="questoes-vazio">Nenhuma questão escolhida.</p>
            ) : (
              <ol className="questoes-selecionadas-lista">
                {selecionadas.map((id) => (
                  <li key={id} data-testid={`questao-selecionada-${id}`}>
                    <span>{tituloDa(id)}</span>
                    <button
                      type="button"
                      className="roteiro-icon-btn"
                      onClick={() => retirar(id)}
                      title="Retirar do roteiro"
                      aria-label="Retirar do roteiro"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              className="roteiro-btn-primary"
              onClick={() => onConfirmar(selecionadas)}
              data-testid="adicionar-ao-roteiro-button"
            >
              Adicionar ao roteiro
            </button>
          </div>

          {/* Banco de questões */}
          <div className="questoes-banco">
            <h4>Banco de questões</h4>
            <div className="roteiro-field">
              <label htmlFor="questoes-busca">Buscar pelo título:</label>
              <input
                id="questoes-busca"
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                data-testid="questoes-busca-input"
              />
            </div>

            {erro && (
              <div className="error-message" role="alert">
                {erro}
              </div>
            )}

            <div className="roteiros-table-wrapper questoes-banco-tabela">
              {questoesFiltradas.length === 0 ? (
                <p className="questoes-vazio">Nenhuma questão encontrada.</p>
              ) : (
                <table data-testid="questoes-banco-lista">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo de resposta</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questoesFiltradas.map((questao) => (
                      <tr key={questao.id} data-testid={`questao-banco-${questao.id}`}>
                        <td>{questao.titulo}</td>
                        <td>{TIPO_QUESTAO_LABEL[questao.tipo]}</td>
                        <td>
                          <div className="roteiro-actions-cell">
                            <button
                              type="button"
                              className="roteiro-btn-secondary"
                              onClick={() => adicionar(questao.id)}
                              disabled={selecionadas.includes(questao.id)}
                              data-testid={`adicionar-questao-${questao.id}`}
                            >
                              {selecionadas.includes(questao.id) ? 'Adicionada' : 'Adicionar'}
                            </button>
                            <button
                              type="button"
                              className="roteiro-icon-btn"
                              onClick={() => setQuestaoEmEdicao(questao)}
                              title="Editar questão"
                              aria-label="Editar questão"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="roteiro-icon-btn"
                              onClick={() => handleRemoverQuestao(questao.id)}
                              title="Remover do banco"
                              aria-label="Remover do banco"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              type="button"
              className="roteiro-fab"
              onClick={() => setQuestaoEmEdicao(null)}
              title="Nova questão"
              aria-label="Nova questão"
              data-testid="nova-questao-button"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {questaoEmEdicao !== undefined && (
        <QuestaoFormModal
          questao={questaoEmEdicao}
          onSalvar={handleSalvarQuestao}
          onFechar={() => setQuestaoEmEdicao(undefined)}
        />
      )}
    </div>
  );
};

export default QuestoesRoteiroModal;
