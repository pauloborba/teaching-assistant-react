import React, { useState } from 'react';
import { QuestaoItem, QuestaoPayload, TipoQuestao, TIPO_QUESTAO_LABEL } from '../types/Questao';

interface QuestaoFormModalProps {
  questao?: QuestaoItem | null; // presente ao editar uma questão existente
  onSalvar: (payload: QuestaoPayload) => Promise<void>;
  onFechar: () => void;
}

const LIMITE_ENUNCIADO = 500;
const LETRAS = 'ABCDEFGHIJ';

// Pop-up para criar uma questão no banco ou atualizar uma existente
const QuestaoFormModal: React.FC<QuestaoFormModalProps> = ({ questao, onSalvar, onFechar }) => {
  const [titulo, setTitulo] = useState<string>(questao?.titulo ?? '');
  const [enunciado, setEnunciado] = useState<string>(questao?.enunciado ?? '');
  const [tipo, setTipo] = useState<TipoQuestao>(questao?.tipo ?? 'texto');
  const [alternativasTexto, setAlternativasTexto] = useState<string>(
    (questao?.alternativas ?? []).map((a) => a.texto).join('\n')
  );
  const [erro, setErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Uma alternativa por linha; os ids viram A, B, C...
    const alternativas =
      tipo === 'multipla'
        ? alternativasTexto
            .split('\n')
            .map((texto) => texto.trim())
            .filter((texto) => texto.length > 0)
            .map((texto, i) => ({ id: LETRAS[i] ?? String(i + 1), texto }))
        : null;

    try {
      setSalvando(true);
      await onSalvar({ titulo, enunciado, tipo, alternativas });
    } catch (err) {
      setErro((err as Error).message || 'Erro ao salvar questão');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="roteiro-modal-overlay roteiro-modal-overlay-topo">
      <div className="roteiro-modal roteiro-modal-pequeno" data-testid="questao-form-modal">
        <div className="roteiro-modal-header">
          <h3>{questao ? 'Editar questão' : 'Nova questão'}</h3>
          <button type="button" className="roteiro-modal-fechar" onClick={onFechar} title="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="questao-form">
          {erro && (
            <div className="error-message" role="alert" data-testid="questao-error-message">
              {erro}
            </div>
          )}

          <div className="roteiro-field">
            <label htmlFor="questao-titulo">Título:</label>
            <input
              id="questao-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              data-testid="questao-titulo-input"
            />
          </div>

          <div className="roteiro-field">
            <label htmlFor="questao-enunciado">Enunciado:</label>
            <textarea
              id="questao-enunciado"
              rows={5}
              maxLength={LIMITE_ENUNCIADO}
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              data-testid="questao-enunciado-input"
            />
            <span className="questao-contador">
              {enunciado.length}/{LIMITE_ENUNCIADO}
            </span>
          </div>

          <div className="roteiro-field">
            <label htmlFor="questao-tipo">Tipo de resposta:</label>
            <select
              id="questao-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoQuestao)}
              data-testid="questao-tipo-select"
            >
              {(Object.keys(TIPO_QUESTAO_LABEL) as TipoQuestao[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_QUESTAO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          {tipo === 'multipla' && (
            <div className="roteiro-field">
              <label htmlFor="questao-alternativas">Alternativas (uma por linha):</label>
              <textarea
                id="questao-alternativas"
                rows={4}
                value={alternativasTexto}
                onChange={(e) => setAlternativasTexto(e.target.value)}
                data-testid="questao-alternativas-input"
              />
            </div>
          )}

          <div className="questao-form-actions">
            <button
              type="submit"
              className="roteiro-btn-primary"
              disabled={salvando}
              data-testid="questao-submit-button"
            >
              {questao ? 'Salvar alterações' : 'Adicionar ao banco de questões'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestaoFormModal;
