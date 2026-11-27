import React, { useEffect, useState } from 'react';
import responseTimeReportService from '../services/ResponseTimeReportService';
import { roteiroService } from '../services/RoteiroService';
import { RoteiroItem } from '../types/Roteiro';
import { Class } from '../types/Class';
import { nomeDaTurma } from './TurmasSelect';
import {
  ResponseTimeReportData,
  StudentResponseData,
} from '../types/ResponseTimeReport';
import './ResponseTimeReport.css';

const createEmptyResponse = (): StudentResponseData => ({
  studentId: '',
  name: '',
  grade: 0,
  responseTime: 0,
});

interface ResponseTimeReportProps {
  turmas: Class[];
}

const ResponseTimeReport: React.FC<ResponseTimeReportProps> = ({ turmas }) => {
  const [responses, setResponses] = useState<StudentResponseData[]>([]);
  const [roteiros, setRoteiros] = useState<RoteiroItem[]>([]);
  const [roteiroId, setRoteiroId] = useState<string>('');
  const [turmaId, setTurmaId] = useState<string>('');
  const [report, setReport] = useState<ResponseTimeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roteiroService
      .getAllRoteiros()
      .then(setRoteiros)
      .catch(() => setError('Não foi possível carregar os roteiros.'));
  }, []);

  const roteiroSelecionado = roteiros.find(r => r.id === roteiroId);
  const turmasDoRoteiro = turmas.filter(t => roteiroSelecionado?.turmaIds.includes(t.id));

  // Preenche a tabela com as respostas corrigidas do roteiro escolhido
  const carregarRespostas = async () => {
    setError('');
    setReport(null);
    if (!roteiroId) {
      setError('Escolha um roteiro.');
      return;
    }
    try {
      setLoading(true);
      const dados = await responseTimeReportService.getRespostasDoRoteiro(roteiroId, turmaId || undefined);
      setResponses(dados);
      if (dados.length === 0) setError('Este roteiro ainda não tem respostas corrigidas.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as respostas.');
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (
    index: number,
    field: keyof StudentResponseData,
    value: string
  ) => {
    setResponses(current => current.map((response, i) => {
      if (i !== index) return response;
      if (field === 'grade' || field === 'responseTime') {
        return { ...response, [field]: value === '' ? 0 : Number(value) };
      }
      return { ...response, [field]: value };
    }));
    setReport(null);
  };

  const addResponse = () => {
    setResponses(current => [...current, createEmptyResponse()]);
    setReport(null);
  };

  const removeResponse = (index: number) => {
    setResponses(current => current.filter((_, i) => i !== index));
    setReport(null);
  };

  const generateReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setReport(null);

    if (responses.some(response => !response.studentId.trim() || !response.name.trim())) {
      setError('Preencha o identificador e o nome de todos os alunos.');
      return;
    }
    if (responses.some(response => !Number.isFinite(response.grade) || response.grade < 0 || response.grade > 10)) {
      setError('As notas devem estar entre 0 e 10.');
      return;
    }
    if (responses.some(response => !Number.isFinite(response.responseTime) || response.responseTime <= 0)) {
      setError('Os tempos de resposta devem ser maiores que zero.');
      return;
    }

    try {
      setLoading(true);
      const result = await responseTimeReportService.generateReport(responses);
      setReport(result);
      if (result.correlationError) setError(result.correlationError);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number | null) =>
    value === null ? '—' : value.toFixed(2).replace('.', ',');

  return (
    <section className="response-time-report">
      <div className="response-report-heading">
        <h2>Response Time Report</h2>
        <p>Informe as respostas de um único roteiro para analisar a relação entre tempo e nota.</p>
      </div>

      <div className="response-report-notice">
        Escolha um roteiro e, se quiser, uma turma para carregar a nota e o tempo de cada aluno a partir das respostas corrigidas. Os valores podem ser ajustados na tabela antes de gerar o relatório.
      </div>

      <div className="response-report-selecao">
        <label>
          Roteiro:
          <select
            value={roteiroId}
            onChange={e => { setRoteiroId(e.target.value); setTurmaId(''); }}
            data-testid="correlacao-roteiro-select"
          >
            <option value="">Selecione um roteiro</option>
            {roteiros.map(r => (
              <option key={r.id} value={r.id}>{r.titulo}</option>
            ))}
          </select>
        </label>
        <label>
          Turma:
          <select
            value={turmaId}
            onChange={e => setTurmaId(e.target.value)}
            disabled={!roteiroSelecionado}
            data-testid="correlacao-turma-select"
          >
            <option value="">Todas as turmas do roteiro</option>
            {turmasDoRoteiro.map(t => (
              <option key={t.id} value={t.id}>{nomeDaTurma(t)}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={carregarRespostas} disabled={loading} data-testid="correlacao-carregar-button">
          Carregar respostas
        </button>
      </div>

      <form onSubmit={generateReport}>
        <div className="response-report-table-wrapper">
          <table className="response-report-table">
            <thead>
              <tr>
                <th>ID do aluno</th>
                <th>Nome</th>
                <th>Nota (0–10)</th>
                <th>Tempo (minutos)</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response, index) => (
                <tr key={`${response.studentId}-${index}`}>
                  <td><input aria-label={`ID do aluno ${index + 1}`} value={response.studentId} onChange={e => updateResponse(index, 'studentId', e.target.value)} /></td>
                  <td><input aria-label={`Nome do aluno ${index + 1}`} value={response.name} onChange={e => updateResponse(index, 'name', e.target.value)} /></td>
                  <td><input aria-label={`Nota do aluno ${index + 1}`} type="number" min="0" max="10" step="0.1" value={response.grade} onChange={e => updateResponse(index, 'grade', e.target.value)} /></td>
                  <td><input aria-label={`Tempo do aluno ${index + 1}`} type="number" min="0.01" step="0.01" value={response.responseTime} onChange={e => updateResponse(index, 'responseTime', e.target.value)} /></td>
                  <td><button type="button" className="response-remove-button" onClick={() => removeResponse(index)}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="response-report-actions">
          <button type="button" className="response-secondary-button" onClick={addResponse}>Adicionar aluno</button>
          <button type="submit" disabled={loading}>{loading ? 'Gerando...' : 'Gerar relatório'}</button>
        </div>
      </form>

      {error && <div className="response-report-error" role="alert">{error}</div>}

      {report && (
        <section className="response-report-results" aria-live="polite">
          <h3>Resultados do relatório</h3>
          <div className="response-report-metrics">
            <div className="response-report-metric"><span>Média do tempo</span><strong>{formatNumber(report.averageResponseTime)} min</strong></div>
            <div className="response-report-metric"><span>Média das notas</span><strong>{formatNumber(report.averageGrade)}</strong></div>
            <div className="response-report-metric"><span>Desvio padrão do tempo</span><strong>{formatNumber(report.standardDeviationResponseTime)} min</strong></div>
            <div className="response-report-metric"><span>Desvio padrão das notas</span><strong>{formatNumber(report.standardDeviationGrade)}</strong></div>
            <div className="response-report-metric"><span>Coeficiente de correlação</span><strong>{formatNumber(report.correlationCoefficient)}</strong></div>
            <div className="response-report-metric"><span>Classificação</span><strong>{report.correlationClassification || 'Indisponível'}</strong></div>
          </div>
        </section>
      )}
    </section>
  );
};

export default ResponseTimeReport;
