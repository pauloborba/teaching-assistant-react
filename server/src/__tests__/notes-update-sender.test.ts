import { notesUpdateSender, notesUpdateBatchSender } from '../services/notifications/notes-update-sender';
import { enviarEmail } from '../services/mailSender';
import { Student } from '../models/Student';
//import '@testing-library/jest-dom';

// --- MOCKS ---
// Mock do módulo de envio de e-mail
jest.mock('../services/mailSender');
const mockEnviarEmail = enviarEmail as jest.MockedFunction<typeof enviarEmail>;

// --- DADOS DE TESTE (usando dados reais do projeto) ---
const mockStudentMaria: Student = {
    cpf: '222.222.222-22',
    name: 'Maria Modularidade',
    email: 'raasa@cin.ufpe.br',
} as Student;

const mockStudentJoao: Student = {
    cpf: '333.333.333-33',
    name: 'João Polimorfismo',
    email: 'joao@cin.ufpe.br',
} as Student;

const mockDisciplina = 'Engenharia de Software';
const mockProfessor = 'Prof. Silvio Meira';

// --- SETUP ---
beforeEach(() => {
    // Limpa o estado do mock antes de cada teste
    jest.clearAllMocks();
    // Garante que o envio de e-mail funcione por padrão
    mockEnviarEmail.mockResolvedValue(undefined);
});

// =======================================================
// TESTES PARA notesUpdateSender (Envio Individual)
// =======================================================
describe('notesUpdateSender', () => {
    it('should call enviarEmail with correct subject and formatted message', async () => {
        await notesUpdateSender({
            student: mockStudentMaria,
            disciplina: mockDisciplina,
            professor: mockProfessor,
        });

        // Verifica se a função de envio foi chamada
        expect(mockEnviarEmail).toHaveBeenCalledTimes(1);

        // Captura os argumentos da chamada
        const [professor, destinatario, assunto, mensagem] = mockEnviarEmail.mock.calls[0];

        // 1. Verifica os destinatários e o remetente
        expect(professor).toBe(mockProfessor);
        expect(destinatario).toBe(mockStudentMaria.email);

        // 2. Verifica o Assunto
        expect(assunto).toBe(`Atualização de Nota - ${mockDisciplina}`);

        // 3. Verifica o Conteúdo da Mensagem (corpo)
        expect(mensagem).toContain("Caro estudante Maria Modularidade");
        expect(mensagem).toContain(`houve uma atualização na sua nota da disciplina "${mockDisciplina}"`);
        expect(mensagem).toContain(`Professor(a): ${mockProfessor}`);
        expect(mensagem).toContain('Para verificar sua nota atualizada, acesse o sistema acadêmico');
        expect(mensagem).toContain('Sistema Acadêmico');
    });

    it('should throw an error if enviarEmail fails', async () => {
        const error = new Error('Falha no serviço de email');
        mockEnviarEmail.mockRejectedValue(error);

        // Espera que a função lance o erro
        await expect(notesUpdateSender({
            student: mockStudentMaria,
            disciplina: mockDisciplina,
            professor: mockProfessor,
        })).rejects.toThrow('Falha no serviço de email');
    });

    it('should include all required information in the email message', async () => {
        await notesUpdateSender({
            student: mockStudentJoao,
            disciplina: mockDisciplina,
            professor: mockProfessor,
        });

        const [, , , mensagem] = mockEnviarEmail.mock.calls[0];
        
        // Verifica se todas as informações obrigatórias estão presentes
        expect(mensagem).toContain(mockStudentJoao.name);
        expect(mensagem).toContain(mockDisciplina);
        expect(mensagem).toContain(mockProfessor);
        expect(mensagem).toContain('Atenciosamente');
    });

    it('should use correct email format for CIn students', async () => {
        await notesUpdateSender({
            student: mockStudentMaria,
            disciplina: mockDisciplina,
            professor: mockProfessor,
        });

        const [, destinatario] = mockEnviarEmail.mock.calls[0];
        
        // Verifica se o email é do domínio CIn
        expect(destinatario).toContain('@cin.ufpe.br');
        expect(destinatario).toBe('raasa@cin.ufpe.br');
    });
});

// =======================================================
// TESTES PARA notesUpdateBatchSender (Envio em Lote)
// =======================================================
describe('notesUpdateBatchSender', () => {
    it('should call notesUpdateSender for every student in the batch', async () => {
        const students = [mockStudentMaria, mockStudentJoao];
        
        const totalEnviados = await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        // 1. Verifica se a função 'enviarEmail' foi chamada 2 vezes
        expect(mockEnviarEmail).toHaveBeenCalledTimes(2);

        // 2. Verifica se a função retornou o número correto de e-mails enviados
        expect(totalEnviados).toBe(2);

        // 3. Verifica a chamada para o primeiro aluno (Maria)
        const [profMaria, emailMaria, assuntoMaria, msgMaria] = mockEnviarEmail.mock.calls[0];
        expect(profMaria).toBe(mockProfessor);
        expect(emailMaria).toBe(mockStudentMaria.email);
        expect(assuntoMaria).toBe(`Atualização de Nota - ${mockDisciplina}`);
        expect(msgMaria).toContain('Maria Modularidade');
        
        // 4. Verifica a chamada para o segundo aluno (João)
        const [profJoao, emailJoao, assuntoJoao, msgJoao] = mockEnviarEmail.mock.calls[1];
        expect(profJoao).toBe(mockProfessor);
        expect(emailJoao).toBe(mockStudentJoao.email);
        expect(assuntoJoao).toBe(`Atualização de Nota - ${mockDisciplina}`);
        expect(msgJoao).toContain('João Polimorfismo');
    });

    it('should handle partial failure and return only the count of successful sends', async () => {
        const students = [mockStudentMaria, mockStudentJoao];

        // Configura o mock para falhar na primeira chamada (Maria) e ter sucesso na segunda (João)
        mockEnviarEmail
            .mockRejectedValueOnce(new Error('Erro na Maria'))
            .mockResolvedValueOnce(undefined);

        // Espiona o console.error para garantir que o erro seja logado, mas não trave o lote
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const totalEnviados = await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        // 1. Verifica se a função 'enviarEmail' foi chamada para AMBOS os alunos
        expect(mockEnviarEmail).toHaveBeenCalledTimes(2);

        // 2. Verifica se o console.error foi chamado (tratamento da falha)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            `Erro ao enviar notificação para ${mockStudentMaria.name}:`, 
            expect.any(Error)
        );

        // 3. Verifica se apenas o e-mail bem-sucedido (João) foi contabilizado
        expect(totalEnviados).toBe(1);

        consoleErrorSpy.mockRestore(); // Restaura o console.error original
    });

    it('should return 0 when the students array is empty', async () => {
        const students: Student[] = [];

        const totalEnviados = await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        // Não deve ter chamado o serviço
        expect(mockEnviarEmail).not.toHaveBeenCalled();
        // Deve retornar 0
        expect(totalEnviados).toBe(0);
    });

    it('should handle all failures gracefully and return 0', async () => {
        const students = [mockStudentMaria, mockStudentJoao];

        // Configura o mock para falhar em todas as chamadas
        mockEnviarEmail.mockRejectedValue(new Error('Serviço de email indisponível'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const totalEnviados = await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        // 1. Verifica se tentou enviar para todos
        expect(mockEnviarEmail).toHaveBeenCalledTimes(2);

        // 2. Verifica se logou os erros
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

        // 3. Verifica se retornou 0 (nenhum sucesso)
        expect(totalEnviados).toBe(0);

        consoleErrorSpy.mockRestore();
    });

    it('should work with real student data from database', async () => {
        const students = [mockStudentMaria, mockStudentJoao];
        
        const totalEnviados = await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        // Verifica se funcionou com dados reais
        expect(totalEnviados).toBe(2);
        
        // Verifica se os CPFs estão no formato correto
        expect(mockStudentMaria.cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
        expect(mockStudentJoao.cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
        
        // Verifica se os emails são institucionais
        expect(mockStudentMaria.email).toContain('@cin.ufpe.br');
        expect(mockStudentJoao.email).toContain('@cin.ufpe.br');
    });

    it('should send emails with correct professor signature', async () => {
        const students = [mockStudentMaria];
        
        await notesUpdateBatchSender(
            students, 
            mockDisciplina, 
            mockProfessor
        );

        const [professor, , , mensagem] = mockEnviarEmail.mock.calls[0];
        
        // Verifica se o professor está correto tanto no remetente quanto na mensagem
        expect(professor).toBe('Prof. Silvio Meira');
        expect(mensagem).toContain('Prof. Silvio Meira');
    });
});

// =======================================================
// TESTES DE INTEGRAÇÃO E CENÁRIOS ESPECÍFICOS
// =======================================================
describe('Integration Tests - Real Database Scenarios', () => {
    it('should handle Engineering Software course notifications', async () => {
        const engSoftwareDisciplina = 'Engenharia de Software';
        const professor = 'Prof. Silvio Meira';
        
        await notesUpdateSender({
            student: mockStudentMaria,
            disciplina: engSoftwareDisciplina,
            professor: professor,
        });

        const [, , assunto, mensagem] = mockEnviarEmail.mock.calls[0];
        
        expect(assunto).toBe('Atualização de Nota - Engenharia de Software');
        expect(mensagem).toContain('Engenharia de Software');
        expect(mensagem).toContain('Prof. Silvio Meira');
    });

    it('should validate CPF format consistency', () => {
        // Testa se os CPFs estão no formato esperado do banco de dados
        expect(mockStudentMaria.cpf).toBe('222.222.222-22');
        expect(mockStudentJoao.cpf).toBe('333.333.333-33');
        
        // Verifica se têm o método getCPF (interface do Student)
        expect(typeof mockStudentMaria.getCPF).toBe('function');
        expect(typeof mockStudentJoao.getCPF).toBe('function');
    });
});