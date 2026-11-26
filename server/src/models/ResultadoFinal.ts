/** Resultado final de um aluno na disciplina. */
export type ResultadoFinal =
  | 'Aprovado'
  | 'Final'
  | 'Reprovado'
  | 'Aprovado na final'
  | 'Reprovado na final'
  | 'Reprovado por falta';

export const MEDIA_PARA_APROVACAO = 7;
export const MEDIA_MINIMA_PARA_FINAL = 3;
export const MEDIA_FINAL_PARA_APROVACAO = 5;

// As médias são comparadas com duas casas decimais, como são apresentadas.
const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

/** Média depois da prova final: (média + nota da prova final) / 2. */
export function calcularMediaPosFinal(mediaPreFinal: number | null, notaProvaFinal: number | null): number | null {
  if (mediaPreFinal === null || notaProvaFinal === null) return null;
  return (mediaPreFinal + notaProvaFinal) / 2;
}

/**
 * Regras do resultado final:
 * - reprovação por falta prevalece sobre qualquer média;
 * - média >= 7,0: Aprovado; média < 3,0: Reprovado; caso contrário, Final;
 * - na final, (média + nota da prova final) / 2 >= 5,0: Aprovado na final; senão, Reprovado na final.
 * Sem média (notas pendentes), o resultado ainda não está definido (null).
 */
export function calcularResultadoFinal(
  mediaPreFinal: number | null,
  notaProvaFinal: number | null,
  reprovadoPorFalta: boolean
): ResultadoFinal | null {
  if (reprovadoPorFalta) return 'Reprovado por falta';
  if (mediaPreFinal === null) return null;

  const media = arredondar(mediaPreFinal);
  if (media >= MEDIA_PARA_APROVACAO) return 'Aprovado';
  if (media < MEDIA_MINIMA_PARA_FINAL) return 'Reprovado';

  const mediaFinal = calcularMediaPosFinal(media, notaProvaFinal);
  if (mediaFinal === null) return 'Final';
  return arredondar(mediaFinal) >= MEDIA_FINAL_PARA_APROVACAO ? 'Aprovado na final' : 'Reprovado na final';
}
