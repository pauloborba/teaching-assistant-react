export type StudentStatusColor = 'green' | 'yellow' | 'red';

export const getStudentStatusColor = (
  mediaAluno: number,
  mediaTurma: number,
  temReprovacaoAnterior: boolean
): StudentStatusColor => {

  if (temReprovacaoAnterior) {
    return 'red';
  }

  if (mediaAluno >= mediaTurma) {
    return 'green';
  }

  if (mediaTurma > 0) {
    const diffPercent = ((mediaTurma - mediaAluno) / mediaTurma) * 100;

    if (Number(diffPercent.toFixed(2)) <= 10) {
      return 'yellow';
    }
  }
  return 'red';
};
