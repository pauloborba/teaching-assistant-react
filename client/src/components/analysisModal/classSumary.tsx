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
} from 'recharts';
import ClassService from '../services/ClassService';
import {
  generateAnalyticsForDiscipline,
  transformToChartData,
  ChartDataPoint
} from '../../lib/StudentsAnalyticsCalculator';

interface classSumaryProps {
  data: ChartData[];
  discipline?: string;
}

/**
 * Componente que exibe o gráfico de analytics para uma disciplina específica.
 * Busca automaticamente os dados da API e processa localmente.
 */
const classSumary: React.FC<classSumaryProps> = 
  ({ data, discipline }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!discipline) {
      setLoading(false);
      return;
    }

    const fetchAndProcessData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar todas as turmas da API
        const allClasses = data;

        // Gerar analytics para a disciplina específica
        const analyticsData = generateAnalyticsForDiscipline(discipline, allClasses);
        //console.log('📊 Analytics gerados:', analyticsData);

        // Transformar para formato do gráfico
        const transformedData = transformToChartData(analyticsData);
        //console.log('📈 Dados transformados para o gráfico:', transformedData);

        setChartData(transformedData);
      } catch (err) {
        //console.error('Erro ao processar analytics:', err);
        setError('Falha ao carregar os dados de analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, [discipline]);

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
    <div style={{ width: '100%', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Analytics - {discipline}
      </h2>
      
      <div style={{ width: '100%', height: 400 }}>
        {/* Avoid ResponsiveContainer due to React context mismatch in some setups.
            Use fixed pixel width for reliable rendering during testing. */}
        <LineChart
          width={900}
          height={400}
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
            <Legend />
            
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
      </div>

      {/* Legenda explicativa */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
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

export default classSumary;