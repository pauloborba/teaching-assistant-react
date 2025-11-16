export type Grade = 'MANA' | 'MPA' | 'MA' | number;

// Funções auxiliares (apenas interface) 

export function getStudentMediaParcial(studentCpf: string, classId: string): number | null {
    // retornar a media parcial do aluno
    throw new Error("Not implemented");
}

export function isStudentReprovadoPorFalta(studentCpf: string, classId: string): boolean | null {
    // buscar se já está reprovado por falta
    throw new Error("Not implemented");
}

export function getStudentFrequencyPercentage(studentCpf: string, classId: string): number | null {
    // retornar a frequencia do aluno
    throw new Error("Not implemented");
}

export function convertGradeToNumeric(grade: Grade): number | null {
    // converter nota conceitual para numerica
    throw new Error("Not implemented");
}

export function getApprovalThresholds(classId: string){
    // buscar os limites de nota e frequência da turma
    throw new Error("Not implemented");
}

export function getActualPreviousFailuresCount(studentCpf: string, currentClassId: string): number | null {
    // buscar no histórico de matrículas reprovações 
    throw new Error("Not implemented");
}

// Função principal
export function getClassificacaoAcademica(studentCpf: string, classId: string){  
    // Determina a cor de status acadêmico (Verde, Laranja, Vermelho) e seus motivos
    throw new Error("Not implemented");
};