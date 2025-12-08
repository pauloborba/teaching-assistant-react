import { enviarEmail } from "./EmailSender";
import { Student } from "../models/Student";

export async function notificarResultadoDisciplina(student: Student,nota: number,disciplina: string,professorNome: string): Promise<void> {

  let resultado = "";

  if (nota >= 7) {
    resultado = "Aprovado por média";
  } else if (nota >= 3) {
    resultado = "Final";
  } else {
    resultado = "Reprovado";
  }

  const assunto = `Resultado da Disciplina ${disciplina}`;
  const mensagem = `
Prezado(a) ${student.name},

${resultado}. Sua nota em ${disciplina} foi ${nota.toFixed(1)}.

Atenciosamente,
${professorNome}
  `;

  await enviarEmail(professorNome, student.email, assunto, mensagem);
  
}

export async function notificarAlunosEmLote(students: Student[],disciplina: string,professorNome: string,getNota: (student: Student) => number): Promise<number> {
  
  const promises = students.map(async student => {

    const nota = getNota(student);
    await notificarResultadoDisciplina(student, nota, disciplina, professorNome);

  });

  await Promise.all(promises);

  return students.length;

}
