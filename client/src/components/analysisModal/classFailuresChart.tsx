// src/components/charts/classFailureChart.tsx
// (ou onde você preferir)

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
 Card,
 CardContent,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";

// 1. Tipo dos dados que o gráfico espera receber
export type ChartData = {
 name: string; // Ex: "2025-1"
 failures: number; // Número de reprovações (reatrículas)
};

interface ClassFailureChartProps {
 data: ChartData[];
}

// 2. O componente do gráfico
export const ClassFailureChart: React.FC<ClassFailureChartProps> = ({ data }) => {
 return (
  <Card className="w-full">
   <CardHeader>
    {/* Você pode mudar o título se quiser */}
    <CardTitle>Alunos Rematriculados (Reprovações) por Turma</CardTitle>
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
       allowDecimals={false} // Garante que o eixo Y mostre 1, 2, 3...
      />
      <Tooltip
       // Estilos para se adaptar ao tema do shadcn
       cursor={{ fill: "hsl(var(--muted))" }}
       contentStyle={{
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))"
       }}
      />
      <Bar
       dataKey="failures"
       // Cor primária do tema (pode ser "hsl(var(--primary))")
       fill="#8884d8"
       radius={[4, 4, 0, 0]}
      />
     </BarChart>
    </ResponsiveContainer>
   </CardContent>
  </Card>
 );
};
