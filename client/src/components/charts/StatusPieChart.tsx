import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { StatusCounts } from '../../types/Report';

interface StatusPieChartProps {
  data: StatusCounts;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

const STATUS_COLORS: Record<string, string> = {
  'Approved': '#28a745',
  'Approved (Final)': '#20c997',
  'Failed': '#dc3545',
  'Failed (Absence)': '#fd7e14',
  'Pending': '#ffc107'
};

/**
 * StatusPieChart - Displays a pie chart of student status distribution.
 */
const StatusPieChart: React.FC<StatusPieChartProps> = ({ data }) => {
  const chartData: ChartDataItem[] = [
    { name: 'Approved', value: data.approvedCount, color: STATUS_COLORS['Approved'] },
    { name: 'Approved (Final)', value: data.approvedFinalCount, color: STATUS_COLORS['Approved (Final)'] },
    { name: 'Failed', value: data.notApprovedCount, color: STATUS_COLORS['Failed'] },
    { name: 'Failed (Absence)', value: data.failedByAbsenceCount, color: STATUS_COLORS['Failed (Absence)'] },
    { name: 'Pending', value: data.pendingCount, color: STATUS_COLORS['Pending'] }
  ].filter(item => item.value > 0);

  const hasData = chartData.length > 0;

  const renderCustomLabel = ({ name, percent }: { name?: string; percent?: number }) => {
    if (percent === undefined) return '';
    return `${name || ''}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="chart-container" data-testid="status-pie-chart">
      <h4>Student Status Distribution</h4>
      <div className="chart-wrapper" data-testid="pie-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {hasData ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} student(s)`, '']}
              />
              <Legend />
            </PieChart>
          ) : (
            <PieChart>
              <Pie
                data={[{ name: 'No Data', value: 1 }]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#e0e0e0"
                dataKey="value"
                label={false}
              >
                <Cell fill="#e0e0e0" />
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>

        {!hasData && (
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
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Ainda não há notas lançadas para gerar o gráfico.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPieChart;
