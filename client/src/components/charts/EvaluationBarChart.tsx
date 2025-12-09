import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { EvaluationPerformance } from '../../types/Report';
import { wrapText } from '../../utils';

// --- Types ---
interface EvaluationBarChartProps {
  data: EvaluationPerformance[];
}

interface ChartDataItem {
  goal: string;
  averageGrade: number;
  hasData: boolean;
}

// --- Constants ---
const BAR_COLOR_WITH_DATA = '#4a90d9';
const BAR_COLOR_NO_DATA = '#d0d0d0';
const MAX_GRADE = 10;

// --- Sub-components ---

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, chartData } = props;
  
  if (!payload || !payload.value) return null;

  const item = chartData.find((d: ChartDataItem) => d.goal === payload.value);
  const isGrayed = !item?.hasData;
  const lines = wrapText(payload.value, 12);

  return (
    <g transform={`translate(${x},${y}) rotate(-35)`}>
      {lines.map((line: string, index: number) => (
        <text
          key={index}
          x={0}
          y={index * 12}
          dy={10}
          textAnchor="end"
          fill={isGrayed ? '#999' : '#333'}
          fontSize={11}
          fontStyle={isGrayed ? 'italic' : 'normal'}
        >
          {line}
        </text>
      ))}
    </g>
  );
};


interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as ChartDataItem;
    
    if (!item.hasData) {
      return (
        <div className="chart-tooltip" style={{ background: '#fff', padding: '10px', border: '1px solid #ccc' }}>
          <p><strong>{item.goal}</strong></p>
          <p style={{ color: '#999', fontStyle: 'italic' }}>No students evaluated</p>
        </div>
      );
    }
    return (
      <div className="chart-tooltip" style={{ background: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        <p><strong>{item.goal}</strong></p>
        <p>Average: {item.averageGrade.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

// --- Main Component ---

const EvaluationBarChart: React.FC<EvaluationBarChartProps> = ({ data }) => {
  
  const chartData: ChartDataItem[] = useMemo(() => {
    return data.map(item => ({
      goal: item.goal,
      averageGrade: item.averageGrade ?? 0,
      hasData: item.evaluatedStudents > 0
    }));
  }, [data]);

  const hasAnyData = chartData.some(item => item.hasData);

  return (
    <div className="chart-container">
      <h4>Evaluation Performance</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData.length > 0 ? chartData : [{ goal: '', averageGrade: 0, hasData: false }]}
            margin={{ top: 60, right: 30, left: 25, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="goal" 
              tick={(props: any) => <CustomXAxisTick {...props} chartData={chartData} />}
              interval={0}
              height={70}
            />
            <YAxis 
              domain={[0, MAX_GRADE]} 
              label={{ value: 'Average Grade', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="averageGrade" name="Average Grade">
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.hasData ? BAR_COLOR_WITH_DATA : BAR_COLOR_NO_DATA}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {!hasAnyData && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.8)', 
              padding: '10px 20px', 
              borderRadius: '4px',
              color: '#666',
              fontSize: '14px'
            }}>
              Ainda não há notas lançadas para gerar o gráfico.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationBarChart;