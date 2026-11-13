import React, { useState } from 'react';
import { Class } from '../types/Class';
import { CORRELATION_VARIABLES, CorrelationResult } from '../types/Correlation';
import { classService } from '../services/ClassService';

interface CorrelationSectionProps {
  classes: Class[];
  onError: (message: string) => void;
}

const CorrelationSection: React.FC<CorrelationSectionProps> = ({ classes, onError }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [firstVariable, setFirstVariable] = useState('Requirements');
  const [secondVariable, setSecondVariable] = useState('overallAverage');
  const [results, setResults] = useState<CorrelationResult[]>([]);
  const [hasViewed, setHasViewed] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleClass = (classId: string) => {
    setSelectedIds(current => current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId]);
  };

  const viewCorrelations = async () => {
    try {
      setLoading(true);
      setHasViewed(true);
      setResults(await classService.buildCorrelation(selectedIds, [firstVariable, secondVariable]));
      onError('');
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="correlation-section" aria-labelledby="correlation-heading">
      <div className="correlation-header">
        <div>
          <span className="section-eyebrow">Insights</span>
          <h3 id="correlation-heading">Correlações</h3>
          <p>Compare resultados de estudantes entre turmas para identificar padrões de aprendizagem.</p>
        </div>
      </div>

      <div className="correlation-controls">
        <fieldset>
          <legend>Turmas para comparar</legend>
          {classes.length === 0 ? (
            <p className="correlation-help">Ainda não há turmas cadastradas.</p>
          ) : (
            <div className="correlation-options">
              {classes.map(classObj => (
                <button
                  className={`correlation-option ${selectedIds.includes(classObj.id) ? 'selected' : ''}`}
                  type="button"
                  aria-pressed={selectedIds.includes(classObj.id)}
                  onClick={() => toggleClass(classObj.id)}
                >
                  <span>
                    <strong>{classObj.topic}</strong>
                    <small>{classObj.year} · {classObj.semester}º semestre</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Variáveis para medir</legend>
          <p className="correlation-help">Escolha duas variáveis diferentes para descobrir a relação entre elas.</p>
          <div className="variable-selectors">
            <label>
              <span>Variável A</span>
              <select value={firstVariable} onChange={event => setFirstVariable(event.target.value)}>
                {CORRELATION_VARIABLES.map(variable => (
                  <option key={variable.value} value={variable.value}>{variable.label}</option>
                ))}
              </select>
            </label>
            <span className="correlation-versus" aria-hidden="true">×</span>
            <label>
              <span>Variável B</span>
              <select value={secondVariable} onChange={event => setSecondVariable(event.target.value)}>
                {CORRELATION_VARIABLES.map(variable => (
                  <option key={variable.value} value={variable.value}>{variable.label}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      </div>

      <button
        className="correlation-action"
        type="button"
        onClick={viewCorrelations}
        disabled={selectedIds.length === 0 || firstVariable === secondVariable || loading}
      >
        {loading ? 'Analisando dados...' : 'Ver dados de correlação'}
      </button>

      {hasViewed && !loading && results.length === 0 && (
        <div className="correlation-empty" role="status">
          Não há dados suficientes para construir correlações com as seleções atuais.
        </div>
      )}

      {results.length > 0 && (
        <div className="correlation-results" aria-live="polite">
          <h4>Resultados encontrados</h4>
          {results.map(result => (
            <article key={`${result.firstVariable}-${result.secondVariable}`}>
              <div>
                <strong>{result.firstVariableLabel} <span>↔</span> {result.secondVariableLabel}</strong>
                <small>{result.dataPoints} turmas analisadas</small>
              </div>
              <p>
                Há uma correlação <strong>{result.interpretation.toLowerCase()}</strong> entre
                {` ${result.firstVariableLabel.toLowerCase()}`} e {result.secondVariableLabel.toLowerCase()} ({result.value.toFixed(2)}).
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default CorrelationSection;
