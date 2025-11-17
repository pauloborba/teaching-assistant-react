// src/components/charts/classFailureChart.tsx
// (ou onde você preferir)

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
 Card,
 CardContent,
 CardHeader,
 CardTitle,
} from "../ui/card";

// 1. Tipo dos dados que o gráfico espera receber
export type ChartData = {
 name: string; // Nome do aluno
 failures: number; // Número de reprovações do aluno
};

interface ClassFailureChartProps {
 data: ChartData[];
}

export const ClassFailureChart: React.FC<ClassFailureChartProps> = ({ data }) => {
 return (
  <Card style={{ width: '100%' }}>
   <CardHeader style={{ display: 'flex', justifyContent: 'center' }}>
    <CardTitle>Número de Reprovações por Aluno</CardTitle>
   </CardHeader>
   <CardContent>
    <ResponsiveContainer width="100%" height={300}>
     <BarChart data={data}>
      <XAxis
       dataKey="name"
       fontSize={12}
       tickLine={false}
       axisLine={false}
      />
      <YAxis
       fontSize={12}
       tickLine={false}
       axisLine={false}
       allowDecimals={false}
       label={{ value: 'Reprovações', angle: -90, position: 'insideLeft' }}
      />
      <Tooltip
       cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
       contentStyle={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "8px 12px"
       }}
       labelFormatter={(value) => `Aluno: ${value}`}
       formatter={(value: number) => [`${value} reprovação${value !== 1 ? 'ões' : ''}`, 'Total']}
      />
      <Bar
       dataKey="failures"
       fill="#ef4444"
       radius={[4, 4, 0, 0]}
      />
     </BarChart>
    </ResponsiveContainer>
   </CardContent>
  </Card>
 );
};
