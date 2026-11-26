import React, { useState, useEffect, useCallback } from 'react';
import { RoteiroItem } from '../types/Roteiro';
import { roteiroService } from '../services/RoteiroService';

interface RoteirosProps {
  defaultTurma?: string;
  onError?: (message: string) => void;
}

const Roteiros: React.FC<RoteirosProps> = ({
  defaultTurma = 'ESS - 2026.2',
  onError,
}) => {
  const [roteiros, setRoteiros] = useState<RoteiroItem[]>([]);
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [turma, setTurma] = useState<string>(defaultTurma);
  const [dataAbertura, setDataAbertura] = useState<string>('');
  const [prazoEntrega, setPrazoEntrega] = useState<string>('');
  const [atividadesTexto, setAtividadesTexto] = useState<string>('');
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

  useEffect(() => {
    carregarRoteiros();
  }, [carregarRoteiros]);

  const limparFormulario = () => {
    setTitulo('');
    setDescricao('');
    setTurma(defaultTurma);
    setDataAbertura('');
    setPrazoEntrega('');
    setAtividadesTexto('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage('');
    setErrorMessage('');

    const atividadesLista = atividadesTexto
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    try {
      if (editingId) {
        await roteiroService.updateRoteiro(editingId, {
          titulo,
          descricao,
          turma,
          dataAbertura,
          prazoEntrega,
          atividades: atividadesLista,
        });
        setFeedbackMessage('Roteiro atualizado com sucesso');
      } else {
        await roteiroService.createRoteiro({
          titulo,
          descricao,
          turma,
          dataAbertura,
          prazoEntrega,
          atividades: atividadesLista,
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
    setTurma(roteiro.turma);
    setDataAbertura(roteiro.dataAbertura);
    setPrazoEntrega(roteiro.prazoEntrega);
    setAtividadesTexto(roteiro.atividades.map((a) => a.descricao).join('; '));
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
      <h2>Gerenciamento de Roteiros</h2>

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
        <div>
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

        <div>
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

        <div>
          <label htmlFor="roteiro-turma">Turma:</label>
          <input
            id="roteiro-turma"
            name="turma"
            type="text"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            data-testid="roteiro-turma-input"
          />
        </div>

        <div>
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

        <div>
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

        <div>
          <label htmlFor="roteiro-atividades">Atividades (separadas por ponto e vírgula):</label>
          <input
            id="roteiro-atividades"
            name="atividades"
            type="text"
            value={atividadesTexto}
            onChange={(e) => setAtividadesTexto(e.target.value)}
            data-testid="roteiro-atividades-input"
          />
        </div>

        <div>
          <button type="submit" data-testid="roteiro-submit-button">
            {editingId ? 'Atualizar Roteiro' : 'Salvar Roteiro'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={limparFormulario}
              data-testid="roteiro-cancel-edit-button"
            >
              Cancelar Edição
            </button>
          )}
        </div>
      </form>

      <h3>Roteiros Cadastrados</h3>
      {loading ? (
        <p>Carregando roteiros...</p>
      ) : roteiros.length === 0 ? (
        <p data-testid="roteiros-empty-message">Nenhum roteiro cadastrado.</p>
      ) : (
        <table data-testid="roteiros-list">
          <thead>
            <tr>
              <th>Título</th>
              <th>Turma</th>
              <th>Abertura</th>
              <th>Prazo</th>
              <th>Atividades</th>
              <th>Respostas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {roteiros.map((roteiro) => (
              <tr key={roteiro.id} data-testid={`roteiro-row-${roteiro.titulo}`}>
                <td>{roteiro.titulo}</td>
                <td>{roteiro.turma}</td>
                <td>{roteiro.dataAbertura}</td>
                <td>{roteiro.prazoEntrega}</td>
                <td>{roteiro.atividades.map((a) => a.descricao).join('; ')}</td>
                <td>{roteiro.respostas.map((r) => r.alunoNome).join(', ')}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleIniciarEdicao(roteiro)}
                    data-testid={`edit-roteiro-${roteiro.titulo}`}
                  >
                    Editar
                  </button>
                  {pendingDeleteId === roteiro.id ? (
                    <span data-testid="delete-confirmation-box">
                      <button
                        type="button"
                        onClick={() => handleConfirmarExclusao(roteiro.id)}
                        data-testid="confirm-delete-button"
                      >
                        Confirmar Exclusão
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelarExclusao}
                        data-testid="cancel-delete-button"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSolicitarExclusao(roteiro.id)}
                      data-testid={`delete-roteiro-${roteiro.titulo}`}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Roteiros;