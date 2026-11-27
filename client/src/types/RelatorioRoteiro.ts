// Uma linha da tabela do relatório de desempenho do roteiro
export interface LinhaDoRelatorio {
  turma: string;
  mediaAcertos: number;
  mediaErros: number;
  mediaTempoEntrega: number;
}

// Nome da turma como aparece no relatório, ex.: "ESS - 2026.2"
export const getNomeDaTurma = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic} - ${classObj.year}.${classObj.semester}`;
};
