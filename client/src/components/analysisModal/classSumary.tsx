// @ts-nocheck - Recharts tem incompatibilidades de tipo com React 18
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartDataPoint,
  ClassSumaryProps,
  processClassAnalytics
} from '../../lib/classSumary_utils';


/**
 * Componente que exibe o gráfico de analytics para uma disciplina específica.
 * Busca automaticamente os dados da API e processa localmente.
 */
const ClassSumary: React.FC<ClassSumaryProps> = 
  ({ data, discipline, selectedPeriodsCount = 0, totalPeriodsCount = 0 }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      const result = processClassAnalytics(discipline, data);
      setChartData(result ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados de analytics');
    } finally {
      setLoading(false);
    }
  }, [discipline, data]);

  // Estado de loading
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Carregando dados...</p>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
        <p>{error}</p>
      </div>
    );
  }

  // Sem dados
  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Nenhum dado encontrado para a disciplina "{discipline}"</p>
      </div>
    );
  }

  // Renderizar gráfico
  return (
    <div style={{ width: '100%', padding: '20px'}}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem'}}>
        Análise - {discipline}
      </h2>
      
      {/* Informação de filtro */}
      {selectedPeriodsCount > 0 && (
        <div style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#3b82f6',
          marginBottom: '1rem',
          padding: '0.5rem',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          border: '1px solid #bfdbfe',
          fontWeight: '500'
        }}>
          📊 Exibindo {selectedPeriodsCount} de {totalPeriodsCount} período(s)
        </div>
      )}
      
      <div style={{ width: '100%', height: 400 }}>
        {/* ResponsiveContainer permite que o gráfico seja adaptável */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              label={{ value: 'Período (Ano.Semestre)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Número de Alunos', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip />
            
            {/* Linha Verde - APV. M (Aprovado pela Média) */}
            <Line
              type="monotone"
              dataKey="APV. M"
              stroke="#22c55e"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="APV. M (Média ≥ 7.0)"
            />
            
            {/* Linha Amarela - APV. N (Aprovado pela Nota Final) */}
            <Line
              type="monotone"
              dataKey="APV. N"
              stroke="#eab308"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="APV. N (Final ≥ 5.0)"
            />
            
            {/* Linha Laranja - REP. N (Reprovado pela Nota Final) */}
            <Line
              type="monotone"
              dataKey="REP. N"
              stroke="#f97316"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="REP. N (Final < 5.0)"
            />
            
            {/* Linha Vermelha - REP. M (Reprovado pela Média) */}
            <Line
              type="monotone"
              dataKey="REP. M"
              stroke="#ef4444"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="REP. M (Média < 3.0)"
            />
            
            {/* Linha Roxa - REP. F (Reprovado por Falta) */}
            <Line
              type="monotone"
              dataKey="REP. F"
              stroke="#a855f7"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              name="REP. F (Falta)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda explicativa */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Legenda:</h3>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
          <li style={{ marginBottom: '5px' }}>
            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>🟢 APV. M:</span> Aprovado pela Média (≥ 7.0)
          </li>
          <li style={{ marginBottom: '5px' }}>
            <span style={{ color: '#eab308', fontWeight: 'bold' }}>🟡 APV. N:</span> Aprovado pela Nota Final (≥ 5.0)
          </li>
          <li style={{ marginBottom: '5px' }}>
            <span style={{ color: '#f97316', fontWeight: 'bold' }}>🟠 REP. N:</span> Reprovado pela Nota Final (&lt; 5.0)
          </li>
          <li style={{ marginBottom: '5px' }}>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 REP. M:</span> Reprovado pela Média (&lt; 3.0)
          </li>
          <li>
            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>🟣 REP. F:</span> Reprovado por Falta
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ClassSumary;