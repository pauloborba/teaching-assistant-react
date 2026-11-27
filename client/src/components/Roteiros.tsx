import React, { useState, useEffect, useCallback } from 'react';
import { RoteiroItem } from '../types/Roteiro';
import { QuestaoItem } from '../types/Questao';
import { Class } from '../types/Class';
import { roteiroService } from '../services/RoteiroService';
import { questaoService } from '../services/QuestaoService';
import TurmasSelect, { nomeDaTurma } from './TurmasSelect';
import QuestoesRoteiroModal from './QuestoesRoteiroModal';
import './Roteiros.css';

interface RoteirosProps {
  turmas: Class[];
  onError?: (message: string) => void;
}

// Converte a data ISO gravada no servidor para DD/MM/AAAA (formato do formulário e da tabela)
const isoParaDataBR = (iso: string): string => {
  if (!iso) return '';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleDateString('pt-BR');
};

const Roteiros: React.FC<RoteirosProps> = ({ turmas, onError }) => {
  const [roteiros, setRoteiros] = useState<RoteiroItem[]>([]);
  const [questoes, setQuestoes] = useState<QuestaoItem[]>([]);
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const [dataAbertura, setDataAbertura] = useState<string>('');
  const [prazoEntrega, setPrazoEntrega] = useState<string>('');
  const [questaoIds, setQuestaoIds] = useState<string[]>([]);
  const [modalQuestoesAberto, setModalQuestoesAberto] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const carregarRoteiros = useCallback(async () => {
    try {
      setLoading(true);
      const lista = await roteiroService.getAllRoteiros();
      setRoteiros(lista);
    } catch (err) {
      const msg = (err as Error).message || 'Erro ao carregar roteiros';
      setErrorMessage(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const carregarQuestoes = useCallback(async () => {
    try {
      setQuestoes(await questaoService.getAllQuestoes());
    } catch (err) {
      const msg = (err as Error).message || 'Erro ao carregar questões';
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  }, [onError]);

  useEffect(() => {
    carregarRoteiros();
    carregarQuestoes();
  }, [carregarRoteiros, carregarQuestoes]);

  const tituloDaQuestao = (id: string) => questoes.find((q) => q.id === id)?.titulo ?? id;

  const nomesDasTurmas = (ids: string[]) =>
    ids
      .map((id) => {
        const turma = turmas.find((t) => t.id === id);
        return turma ? nomeDaTurma(turma) : id;
      })
      .join('; ');

  const limparFormulario = () => {
    setTitulo('');
    setDescricao('');
    setTurmaIds([]);
    setDataAbertura('');
    setPrazoEntrega('');
    setQuestaoIds([]);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage('');
    setErrorMessage('');

    try {
      if (editingId) {
        await roteiroService.updateRoteiro(editingId, {
          titulo,
          descricao,
          turmaIds,
          dataAbertura,
          prazoEntrega,
          questaoIds,
        });
        setFeedbackMessage('Roteiro atualizado com sucesso');
      } else {
        await roteiroService.createRoteiro({
          titulo,
          descricao,
          turmaIds,
          dataAbertura,
          prazoEntrega,
          questaoIds,
        });
        setFeedbackMessage('Roteiro inserido com sucesso');
      }
      limparFormulario();
      await carregarRoteiros();
    } catch (err) {
      const msg = (err as Error).message || 'Erro ao salvar roteiro';
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  const handleIniciarEdicao = (roteiro: RoteiroItem) => {
    setFeedbackMessage('');
    setErrorMessage('');
    setPendingDeleteId(null);
    setEditingId(roteiro.id);
    setTitulo(roteiro.titulo);
    setDescricao(roteiro.descricao);
    setTurmaIds(roteiro.turmaIds);
    setDataAbertura(isoParaDataBR(roteiro.dataAbertura));
    setPrazoEntrega(isoParaDataBR(roteiro.prazoEntrega));
    setQuestaoIds(roteiro.questaoIds);
  };

  const handleSolicitarExclusao = (id: string) => {
    setFeedbackMessage('');
    setErrorMessage('');
    setPendingDeleteId(id);
  };

  const handleCancelarExclusao = () => {
    setPendingDeleteId(null);
  };

  const handleConfirmarExclusao = async (id: string) => {
    setFeedbackMessage('');
    setErrorMessage('');
    try {
      await roteiroService.deleteRoteiro(id);
      setPendingDeleteId(null);
      setFeedbackMessage('Roteiro removido com sucesso');
      await carregarRoteiros();
    } catch (err) {
      const msg = (err as Error).message || 'Erro ao remover roteiro';
      setPendingDeleteId(null);
      setErrorMessage(msg);
      if (onError) onError(msg);
    }
  };

  return (
    <div className="roteiros-section" data-testid="roteiros-page">
      <div className="roteiros-header">
        <h2>Gerenciamento de Roteiros</h2>
        <span className="roteiros-subtitle">
          {editingId ? 'Editando roteiro existente' : 'Cadastro e acompanhamento'}
        </span>
      </div>

      {feedbackMessage && (
        <div className="success-message" role="status" data-testid="roteiro-success-message">
          {feedbackMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error-message" role="alert" data-testid="roteiro-error-message">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="roteiro-form" data-testid="roteiro-form">
        <div className="roteiro-field">
          <label htmlFor="roteiro-titulo">Título:</label>
          <input
            id="roteiro-titulo"
            name="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            data-testid="roteiro-titulo-input"
          />
        </div>

        <div className="roteiro-field">
          <label htmlFor="roteiro-turmas">Turmas associadas:</label>
          <TurmasSelect turmas={turmas} selecionadas={turmaIds} onChange={setTurmaIds} />
        </div>

        <div className="roteiro-field roteiro-field-full">
          <label htmlFor="roteiro-descricao">Descrição:</label>
          <input
            id="roteiro-descricao"
            name="descricao"
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            data-testid="roteiro-descricao-input"
          />
        </div>

        <div className="roteiro-field">
          <label htmlFor="roteiro-data-abertura">Data de abertura:</label>
          <input
            id="roteiro-data-abertura"
            name="dataAbertura"
            type="text"
            placeholder="DD/MM/AAAA"
            value={dataAbertura}
            onChange={(e) => setDataAbertura(e.target.value)}
            data-testid="roteiro-abertura-input"
          />
        </div>

        <div className="roteiro-field">
          <label htmlFor="roteiro-prazo-entrega">Prazo de entrega:</label>
          <input
            id="roteiro-prazo-entrega"
            name="prazoEntrega"
            type="text"
            placeholder="DD/MM/AAAA"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
            data-testid="roteiro-prazo-input"
          />
        </div>

        <div className="roteiro-field roteiro-field-full">
          <label>Questões:</label>
          <div className="roteiro-questoes-box" data-testid="roteiro-questoes-box">
            {questaoIds.length === 0 ? (
              <p className="questoes-vazio">Nenhuma questão adicionada.</p>
            ) : (
              <ol className="roteiro-questoes-lista">
                {questaoIds.map((id) => (
                  <li key={id}>{tituloDaQuestao(id)}</li>
                ))}
              </ol>
            )}
            <button
              type="button"
              className="roteiro-icon-btn roteiro-questoes-editar"
              onClick={() => setModalQuestoesAberto(true)}
              title="Escolher questões"
              aria-label="Escolher questões"
              data-testid="roteiro-editar-questoes-button"
            >
              ✎
            </button>
          </div>
        </div>

        <div className="roteiro-form-actions">
          <button
            type="submit"
            className="roteiro-btn-primary"
            data-testid="roteiro-submit-button"
          >
            {editingId ? 'Atualizar Roteiro' : 'Salvar Roteiro'}
          </button>
          {editingId && (
            <button
              type="button"
              className="roteiro-btn-secondary"
              onClick={limparFormulario}
              data-testid="roteiro-cancel-edit-button"
            >
              Cancelar Edição
            </button>
          )}
        </div>
      </form>

      <div className="roteiros-list-header">
        <h3>Roteiros Cadastrados</h3>
      </div>

      {loading ? (
        <p className="roteiros-empty">Carregando roteiros...</p>
      ) : roteiros.length === 0 ? (
        <p className="roteiros-empty" data-testid="roteiros-empty-message">
          Nenhum roteiro cadastrado.
        </p>
      ) : (
        <div className="roteiros-table-wrapper">
          <table data-testid="roteiros-list">
            <thead>
              <tr>
                <th>Título</th>
                <th>Abertura</th>
                <th>Fim</th>
                <th>Turmas associadas</th>
                <th>Qtd. Questões</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {roteiros.map((roteiro) => (
                <tr key={roteiro.id} data-testid={`roteiro-row-${roteiro.titulo}`}>
                  <td>{roteiro.titulo}</td>
                  <td>{isoParaDataBR(roteiro.dataAbertura) || '—'}</td>
                  <td>{isoParaDataBR(roteiro.prazoEntrega) || '—'}</td>
                  <td className="roteiro-turmas-cell" title={nomesDasTurmas(roteiro.turmaIds)}>
                    {nomesDasTurmas(roteiro.turmaIds) || '—'}
                  </td>
                  <td>{roteiro.questaoIds.length}</td>
                  <td>
                    <div className="roteiro-actions-cell">
                      <button
                        type="button"
                        className="roteiro-btn-secondary"
                        onClick={() => handleIniciarEdicao(roteiro)}
                        data-testid={`edit-roteiro-${roteiro.titulo}`}
                      >
                        Editar
                      </button>
                      {pendingDeleteId === roteiro.id ? (
                        <span className="delete-confirmation-box" data-testid="delete-confirmation-box">
                          <button
                            type="button"
                            className="roteiro-btn-danger"
                            onClick={() => handleConfirmarExclusao(roteiro.id)}
                            data-testid="confirm-delete-button"
                          >
                            Confirmar Exclusão
                          </button>
                          <button
                            type="button"
                            className="roteiro-btn-secondary"
                            onClick={handleCancelarExclusao}
                            data-testid="cancel-delete-button"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="roteiro-btn-danger"
                          onClick={() => handleSolicitarExclusao(roteiro.id)}
                          data-testid={`delete-roteiro-${roteiro.titulo}`}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalQuestoesAberto && (
        <QuestoesRoteiroModal
          questoes={questoes}
          selecionadasIniciais={questaoIds}
          onConfirmar={(ids) => {
            setQuestaoIds(ids);
            setModalQuestoesAberto(false);
          }}
          onFechar={() => setModalQuestoesAberto(false)}
          onBancoAlterado={carregarQuestoes}
        />
      )}
    </div>
  );
};

export default Roteiros;