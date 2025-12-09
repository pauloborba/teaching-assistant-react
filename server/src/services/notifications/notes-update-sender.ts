import { enviarEmail } from "../mailSender";
import { Student } from "../../models/Student";

type NotesUpdateData = {
    student: Student;
    disciplina: string;
    professor: string;
}

export const notesUpdateSender = async (data: NotesUpdateData): Promise<void> => {
    const assunto = `Atualização de Nota - ${data.disciplina}`;
    
    const mensagem = `
        Caro estudante ${data.student.name},
        
        Informamos que houve uma atualização na sua nota da disciplina "${data.disciplina}".
        
        Para verificar sua nota atualizada, acesse o sistema acadêmico.
        
        Professor(a): ${data.professor}
        
        Atenciosamente,
        Sistema Acadêmico
    `;

    await enviarEmail(
        data.professor,
        data.student.email,
        assunto,
        mensagem
    );
};

// Função para enviar em lote
export const notesUpdateBatchSender = async (
    students: Student[], 
    disciplina: string, 
    professor: string
): Promise<number> => {
    let totalEnviados = 0;
    
    for (const student of students) {
        try {
            await notesUpdateSender({
                student,
                disciplina,
                professor
            });
            
            totalEnviados++;
        } catch (error) {
            console.error(`Erro ao enviar notificação para ${student.name}:`, error);
        }
    }
    
    return totalEnviados;
};