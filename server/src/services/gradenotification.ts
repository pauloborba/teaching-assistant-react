import { enviarEmail } from "./EmailSender";
import { Student } from "../models/Student";

function determineResultText(nota: number): string {
  if (nota >= 7) {
    return "Aprovado por média";
  } else if (nota >= 3) {
    return "Final";
  } else {
    return "Reprovado";
  }
}

export async function notificarResultadoDisciplina(student: Student, nota: number, disciplina: string, professorNome: string): Promise<void> {
  
  const resultado = determineResultText(nota); // Lógica de domínio separada

  const assunto = `Resultado da Disciplina ${disciplina}`;
  const mensagem = `
Prezado(a) ${student.name},

${resultado}. Sua nota em ${disciplina} foi ${nota.toFixed(1)}.

Atenciosamente,
${professorNome}
  `;

  await enviarEmail(professorNome, student.email, assunto, mensagem);
  
}

export async function notificarAlunosEmLote(students: Student[], disciplina: string, professorNome: string, getNota: (student: Student) => number): Promise<number> {
  
  const promises = students.map(async student => {

    const nota = getNota(student);
    await notificarResultadoDisciplina(student, nota, disciplina, professorNome);

  });

  await Promise.all(promises);

  return students.length;

}