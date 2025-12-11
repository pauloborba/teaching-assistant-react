import { Exams, ExamRecord, StudentExamRecord, StudentWithExam } from '../../src/models/Exams'; // Assuma que o caminho para Exams.ts é este
import { Student } from '../../src/models/Student'; // Assuma que o caminho para Student.ts é este

import { expect, describe, test, beforeEach } from '@jest/globals';

//O teste verifica o comportamento de gerenciamento de estado interno da classe, incluindo inicialização, leitura, escrita, mutação e serialização de dados.

describe('Exams Class - Testes de Unidade', () => {
    let initialExams: ExamRecord[];
    let initialStudentExams: StudentExamRecord[];
    let examsInstance: Exams;

    // Dados de Mock
    const mockClassId1 = "CC-2025";
    const mockClassId2 = "ENG-2025";

    const mockExam1: ExamRecord = {
        id: 1,
        classId: mockClassId1,
        title: "Prova de Algoritmos",
        isValid: true,
        openQuestions: 2,
        closedQuestions: 8,
        questions: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]
    };

    const mockExam2: ExamRecord = {
        id: 2,
        classId: mockClassId1,
        title: "Teste de Estruturas",
        isValid: false,
        openQuestions: 1,
        closedQuestions: 4,
        questions: [201, 202, 203, 204, 205]
    };

    const mockExam3: ExamRecord = {
        id: 3,
        classId: mockClassId2,
        title: "Prova de Física I",
        isValid: true,
        openQuestions: 3,
        closedQuestions: 7,
        questions: [301, 302, 303, 304, 305, 306, 307, 308, 309, 310]
    };

    // ----------------------------------------------------------------------
    // INSTÂNCIAS Student REAIS
    // Usamos a classe Student, que exige name, cpf e email no construtor.
    // ----------------------------------------------------------------------
    const studentAlice = new Student("Alice Silva", "111.111.111-11", "alice@example.com");
    const studentBruno = new Student("Bruno Costa", "222.222.222-22", "bruno@example.com");

    const mockStudentExam1: StudentExamRecord = {
        id: 10,
        examId: 1,
        studentCPF: studentAlice.getCPF(), // Usando o CPF real da Alice
        grade: 8.5,
        answers: [{ questionId: 101, answer: "Resp A" }]
    };

    const mockStudentExam2: StudentExamRecord = {
        id: 11,
        examId: 2,
        studentCPF: studentAlice.getCPF(), // Usando o CPF real da Alice
        grade: undefined,
        answers: []
    };

    beforeEach(() => {
        // Inicializa dados com deep clone para evitar que os testes modifiquem os mocks originais
        initialExams = JSON.parse(JSON.stringify([mockExam1, mockExam2, mockExam3]));
        initialStudentExams = JSON.parse(JSON.stringify([mockStudentExam1, mockStudentExam2]));

        // Cria uma nova instância da classe Exams antes de cada teste
        examsInstance = new Exams(initialExams, initialStudentExams);
    });

    // --- Testes do Construtor e Inicialização ---

    test('should initialize with provided data and calculate nextId correctly', () => {
        // maxId é 3, então nextId deve ser 4
        expect(examsInstance.getAllExams().length).toBe(3);
        expect(examsInstance.getNextExamId()).toBe(4); // Pega o 4 e incrementa para 5

        // Testa o caso de inicialização vazia
        const emptyExams = new Exams();
        expect(emptyExams.getAllExams().length).toBe(0);
        expect(emptyExams.getNextExamId()).toBe(1);
    });

    // --- Testes do Gerenciamento de IDs ---

    test('should return the next available exam ID and increment the counter', () => {
        // Inicializado em 4
        expect(examsInstance.getNextExamId()).toBe(4);
        expect(examsInstance.getNextExamId()).toBe(5);
    });

    test('should refresh nextId based on current exams', () => {
        // Adiciona um exame com ID alto para garantir que o refresh funcione
        const highIdExam: ExamRecord = { ...mockExam3, id: 50 };
        examsInstance.addExam(highIdExam);

        // Antes do refresh, o nextId está em 6 (por causa dos gets anteriores)
        examsInstance.refreshNextId();

        // O próximo ID deve ser max(50) + 1 = 51
        expect(examsInstance.getNextExamId()).toBe(51);
    });

    // --- Testes de Leitura (Getters) ---

    test('should return exam by ID', () => {
        expect(examsInstance.getExamById(1)).toEqual(mockExam1);
        expect(examsInstance.getExamById(99)).toBeUndefined();
    });

    test('should return exams filtered by class ID', () => {
        const class1Exams = examsInstance.getExamsByClassId(mockClassId1);
        expect(class1Exams.length).toBe(2);
        expect(class1Exams).toEqual(
            expect.arrayContaining([mockExam1, mockExam2])
        );

        const class2Exams = examsInstance.getExamsByClassId(mockClassId2);
        expect(class2Exams.length).toBe(1);
        expect(class2Exams[0]).toEqual(mockExam3);
    });

    // --- Teste do Método getStudentsWithExams (Lógica Complexa) ---

    describe('getStudentsWithExams', () => {
        // Usando as instâncias Student REAIS
        const enrolledStudents: Student[] = [studentAlice, studentBruno];

        test('should return records for all students and all exams in a class', () => {
            const results = examsInstance.getStudentsWithExams(mockClassId1, enrolledStudents);

            expect(results.length).toBe(4); // 2 alunos * 2 exames

            // Verifica o registro do Aluno Alice, Exame 1 (Com nota e respostas)
            const result1_1 = results.find(r => r.studentCPF === studentAlice.getCPF() && r.examId === 1);
            expect(result1_1).toEqual({
                studentCPF: studentAlice.getCPF(),
                studentName: studentAlice.name,
                examId: 1,
                classId: mockClassId1,
                examTitle: mockExam1.title,
                studentExamId: 10,
                grade: 8.5,
                answers: [{ questionId: 101, answer: "Resp A" }]
            } as StudentWithExam);

            // Verifica o registro do Aluno Bruno, Exame 1 (Sem registro/nota)
            const result2_1 = results.find(r => r.studentCPF === studentBruno.getCPF() && r.examId === 1);
            expect(result2_1).toEqual({
                studentCPF: studentBruno.getCPF(),
                studentName: studentBruno.name,
                examId: 1,
                classId: mockClassId1,
                examTitle: mockExam1.title,
                studentExamId: undefined,
                grade: undefined,
                answers: []
            } as StudentWithExam);
        });

        test('should return records filtered by a specific exam ID', () => {
            // Filtrar apenas pelo Exam 2
            const results = examsInstance.getStudentsWithExams(mockClassId1, enrolledStudents, 2);

            expect(results.length).toBe(2); // 2 alunos * 1 exame

            // Verifica o registro do Aluno Alice, Exame 2
            const result1_2 = results.find(r => r.studentCPF === studentAlice.getCPF() && r.examId === 2);
            expect(result1_2?.studentExamId).toBe(11);
        });

        test('should return an empty array if no exams found for the class', () => {
            const results = examsInstance.getStudentsWithExams("UNKNOWN-CLASS", enrolledStudents);
            expect(results).toEqual([]);
        });
    });

    // --- Testes de Escrita e Mutação ---

    test('should add a new exam', () => {
        const newExamId = examsInstance.getNextExamId(); // 4
        const newExam: ExamRecord = { ...mockExam3, id: newExamId, title: "Novo Exame" };

        examsInstance.addExam(newExam);

        expect(examsInstance.getAllExams().length).toBe(4);
        expect(examsInstance.getExamById(4)).toEqual(newExam);
        expect(examsInstance.getNextExamId()).toBe(5); // nextId foi incrementado
    });

    test('should add a student exam record', () => {
        const newStudentExam: StudentExamRecord = { id: 12, examId: 3, studentCPF: studentBruno.getCPF(), answers: [] };
        examsInstance.addStudentExam(newStudentExam);

        expect(examsInstance.getAllStudentExams().length).toBe(3);
        expect(examsInstance.getAllStudentExams()).toContainEqual(newStudentExam);
    });

    test('should replace all exams and refresh nextId', () => {
        const newExams: ExamRecord[] = [{ ...mockExam1, id: 100 }];
        examsInstance.replaceAll(newExams);

        expect(examsInstance.getAllExams().length).toBe(1);
        expect(examsInstance.getExamById(100)).toBeDefined();
        // nextId deve ser max(100) + 1 = 101
        expect(examsInstance.getNextExamId()).toBe(101);
    });

    test('should update an existing exam', () => {
        const updateSuccess = examsInstance.updateExam(1, { title: "Algoritmos Avançados", isValid: false });

        expect(updateSuccess).toBe(true);
        const updatedExam = examsInstance.getExamById(1);
        expect(updatedExam?.title).toBe("Algoritmos Avançados");
        expect(updatedExam?.isValid).toBe(false); // Mudança de estado
        expect(updatedExam?.classId).toBe(mockExam1.classId); // Outros campos não mudam
    });

    test('should fail to update a non-existent exam', () => {
        const updateSuccess = examsInstance.updateExam(999, { title: "Inexistente" });
        expect(updateSuccess).toBe(false);
    });

    test('should delete an exam and its associated student exams', () => {
        expect(examsInstance.getExamById(1)).toBeDefined();
        expect(examsInstance.getAllStudentExams().length).toBe(2);

        const deleteSuccess = examsInstance.deleteExam(1);

        expect(deleteSuccess).toBe(true);
        expect(examsInstance.getExamById(1)).toBeUndefined();
        expect(examsInstance.getAllExams().length).toBe(2);

        // Verifica se o studentExam1 (que tinha examId 1) foi removido
        expect(examsInstance.getAllStudentExams().length).toBe(1);
        expect(examsInstance.getAllStudentExams()[0].examId).toBe(2);
    });

    test('should fail to delete a non-existent exam', () => {
        const deleteSuccess = examsInstance.deleteExam(999);
        expect(deleteSuccess).toBe(false);
    });

    // --- Testes de Student Exams ---

    test('should update student exam answers', () => {
        const newAnswers = [{ questionId: 101, answer: "Nova Resposta A" }, { questionId: 102, answer: "Nova Resposta B" }];
        const updateSuccess = examsInstance.updateStudentExamAnswers(10, newAnswers);

        expect(updateSuccess).toBe(true);
        const updatedStudentExam = examsInstance.getStudentExamById(10);
        expect(updatedStudentExam?.answers.length).toBe(2);
        expect(updatedStudentExam?.answers).toEqual(newAnswers);
    });

    test('should fail to update answers for a non-existent student exam', () => {
        const updateSuccess = examsInstance.updateStudentExamAnswers(999, []);
        expect(updateSuccess).toBe(false);
    });

    // --- Testes de Persistência (fromJSON / toJSON) ---

    test('should correctly convert to JSON', () => {
        const json = examsInstance.toJSON();

        expect(json).toEqual({ exams: initialExams });
        // O método toJSON deve se concentrar apenas nos 'exams' como implementado
        expect(json).not.toHaveProperty('studentExams');
    });

    test('should correctly create an instance from JSON', () => {
        const jsonData = {
            exams: initialExams,
            studentsExams: initialStudentExams
        };
        const newInstance = Exams.fromJSON(jsonData);

        expect(newInstance.getAllExams().length).toBe(3);
        expect(newInstance.getAllStudentExams().length).toBe(2);
        // Garante que o nextId foi calculado corretamente a partir dos dados carregados
        expect(newInstance.getNextExamId()).toBe(4);
    });

    test('should handle empty JSON data for fromJSON', () => {
        const newInstance = Exams.fromJSON({});

        expect(newInstance.getAllExams().length).toBe(0);
        expect(newInstance.getAllStudentExams().length).toBe(0);
        expect(newInstance.getNextExamId()).toBe(1);
    });
});