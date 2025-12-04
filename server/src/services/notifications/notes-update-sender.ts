import { enviarEmail } from "../mailSender"

type NotesUpdateData = {
    professor: string,
    emailAluno: string,
    // assunto: string,
    // mensagem: string
}

export const notesUpdatesender = (data: NotesUpdateData) => {
    enviarEmail(
            data.professor, 
            data.emailAluno,
            "Atualização de Notas",
            'As notas dos alunos foram atualizadas com sucesso.'
        );
    // Lógica para enviar notificações sobre atualizações de notas
}