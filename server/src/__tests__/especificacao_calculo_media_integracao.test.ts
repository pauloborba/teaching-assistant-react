// especificacao_calculo_media.integration.test.ts
import request from 'supertest';
import { app, studentSet, classes } from '../server';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA, Grade } from '../models/EspecificacaoDoCalculoDaMedia';

// Mock para desabilitar persistência durante testes
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('EspecificacaoDoCalculoDaMedia - Testes de Integração (Servidor)', () => {
  let testStudent: Student;
  let testClass: Class;
  let customEspecificacao: EspecificacaoDoCalculoDaMedia;

  beforeEach(() => {
    // Limpar dados antes de cada teste
    studentSet.getAllStudents().forEach(student => {
      studentSet.removeStudent(student.getCPF());
    });
    
    classes.getAllClasses().forEach(classObj => {
      classes.removeClass(classObj.getClassId());
    });

    // Criar estudante de teste
    testStudent = new Student('João Teste', '111.222.333-44', 'joao@teste.com');
    studentSet.addStudent(testStudent);

    // Criar especificação customizada
    customEspecificacao = EspecificacaoDoCalculoDaMedia.fromJSON({
      pesosDosConceitos: { MA: 10, MPA: 8, MANA: 4 },
      pesosDasMetas: {
        'Meta 1': 2,
        'Meta 2': 3,
        'Meta 3': 5
      }
    });

    // Criar turma de teste com especificação padrão
    testClass = new Class('Teste Integração', 1, 2024, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    classes.addClass(testClass);
  });

  afterEach(() => {
    // Limpar após cada teste
    jest.clearAllMocks();
  });

  // Teste 1: Criar turma com especificação padrão via API
  it('deve criar uma turma com especificação padrão via API', async () => {
    const response = await request(app)
      .post('/api/classes')
      .send({
        topic: 'Nova Turma',
        semester: 1,
        year: 2024
      });

    expect(response.status).toBe(201);
    expect(response.body.topic).toBe('Nova Turma');
    expect(response.body.especificacaoDoCalculoDaMedia).toBeDefined();
    
    // Verificar que a especificação padrão foi usada
    const especificacao = response.body.especificacaoDoCalculoDaMedia;
    expect(especificacao.pesosDosConceitos.MA).toBe(10);
    expect(especificacao.pesosDosConceitos.MPA).toBe(7);
    expect(especificacao.pesosDosConceitos.MANA).toBe(0);
  });

  // Teste 2: Obter turma e verificar especificação
  it('deve retornar a especificação ao obter uma turma', async () => {
    // Primeiro criar uma turma
    const createResponse = await request(app)
      .post('/api/classes')
      .send({
        topic: 'Turma Teste',
        semester: 1,
        year: 2024
      });

    const classId = createResponse.body.id;

    // Obter todas as turmas
    const response = await request(app)
      .get('/api/classes');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Encontrar a turma criada
    const turmaCriada = response.body.find((c: any) => c.id === classId);
    expect(turmaCriada).toBeDefined();
    expect(turmaCriada.especificacaoDoCalculoDaMedia).toBeDefined();
  });

  // Teste 3: Cálculo direto usando especificação (teste de integração sem API)
    describe('Testes Diretos de Cálculo com Especificação', () => {
        it('deve calcular média corretamente usando especificação da turma', () => {
        // Criar especificação customizada
        const especificacao = new EspecificacaoDoCalculoDaMedia(
            new Map([['MA', 10], ['MPA', 7], ['MANA', 0]]),
            new Map([
            ['Meta 1', 2],
            ['Meta 2', 3],
            ['Meta 3', 5]
            ])
        );

        // Criar turma com essa especificação
        const turma = new Class('Turma Cálculo', 1, 2024, especificacao);
        
        // Matricular aluno
        const enrollment = turma.addEnrollment(testStudent);
        
        // Atribuir notas
        enrollment.addOrUpdateEvaluation('Meta 1', 'MA');
        enrollment.addOrUpdateEvaluation('Meta 2', 'MPA');
        enrollment.addOrUpdateEvaluation('Meta 3', 'MANA');
        
        // Obter avaliações e calcular média
        const evaluations = enrollment.getEvaluations();
        const notasDasMetas = new Map();
        evaluations.forEach(evaluation => {
            notasDasMetas.set(evaluation.getGoal(), evaluation.getGrade());
        });
        
        // Calcular média usando a especificação da turma
        const media = turma.getEspecificacaoDoCalculoDaMedia().calc(notasDasMetas);
        
        // Verificar cálculo: (2*10 + 3*7 + 5*0) / (2+3+5) = (20 + 21 + 0) / 10 = 41/10 = 4.1
        expect(media).toBe(4.1);
        });

        // Teste 9: Testar com especificação diferente
        it('deve calcular médias diferentes com especificações diferentes', () => {
        // Especificação 1 (padrão)
        const especificacao1 = DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA;
        
        // Especificação 2 (mais branda - MANA vale 4)
        const especificacao2 = new EspecificacaoDoCalculoDaMedia(
            new Map([['MA', 10], ['MPA', 8], ['MANA', 4]]),
            new Map([
            ['Gerência de Configuração', 1],
            ['Gerência de Projeto', 1],
            ['Qualidade de Software', 1]
            ])
        );
        
        // Mesmas notas
        const notas = new Map<string, Grade>([
            ['Gerência de Configuração', 'MA'],
            ['Gerência de Projeto', 'MPA'],
            ['Qualidade de Software', 'MANA']
        ]);
        
        const media1 = especificacao1.calc(notas);
        const media2 = especificacao2.calc(notas);
        
        // A especificação mais branda deve dar média maior
        expect(media2).toBeGreaterThan(media1);
        
        // Cálculos específicos:
        // especificacao1: (10*1 + 7*1 + 0*1) / 3 = 17/3 ≈ 5.6667
        // especificacao2: (10*1 + 8*1 + 4*1) / 3 = 22/3 ≈ 7.3333
        expect(media1).toBeCloseTo(5.6667, 4);
        expect(media2).toBeCloseTo(7.3333, 4);
    });

  // Teste 4: Tentar usar especificação inválida
  it('deve rejeitar especificação inválida', () => {
    // Teste direto na classe (não via API pois a API não permite customização ainda)
    expect(() => {
      new EspecificacaoDoCalculoDaMedia(
        new Map([['MA', 10]]),
        new Map() // Metas vazias - soma zero
      );
    }).toThrow('A soma dos pesos das metas não pode ser zero.');
  });

  // Teste 5: Serialização/Deserialização via JSON da API
  it('deve manter consistência na serialização JSON', async () => {
    // Criar turma
    const response = await request(app)
      .post('/api/classes')
      .send({
        topic: 'Turma Serialização',
        semester: 2,
        year: 2024
      });

    const json = response.body;
    
    // Verificar estrutura da especificação
    expect(json.especificacaoDoCalculoDaMedia).toHaveProperty('pesosDosConceitos');
    expect(json.especificacaoDoCalculoDaMedia).toHaveProperty('pesosDasMetas');
    
    // Verificar tipos
    expect(typeof json.especificacaoDoCalculoDaMedia.pesosDosConceitos).toBe('object');
    expect(typeof json.especificacaoDoCalculoDaMedia.pesosDasMetas).toBe('object');
    
    // Poderíamos reconstruir a especificação a partir do JSON
    const especificacaoReconstruida = EspecificacaoDoCalculoDaMedia.fromJSON(
      json.especificacaoDoCalculoDaMedia
    );
    
    expect(especificacaoReconstruida).toBeInstanceOf(EspecificacaoDoCalculoDaMedia);
    });
     // Teste 10: Validação de especificação inválida
    it('deve rejeitar especificação inválida', () => {
      expect(() => {
        new EspecificacaoDoCalculoDaMedia(
          new Map([['MA', 10]]),
          new Map() // Metas vazias - soma zero
        );
      }).toThrow('A soma dos pesos das metas não pode ser zero.');
    });

    // Teste 11: Cálculo com notas incompletas
    it('deve calcular média mesmo com notas incompletas', () => {
      const especificacao = new EspecificacaoDoCalculoDaMedia(
        new Map([['MA', 10], ['MPA', 7], ['MANA', 0]]),
        new Map([
          ['Meta 1', 1],
          ['Meta 2', 2],
          ['Meta 3', 3]
        ])
      );
      
      // Apenas duas das três metas têm notas
      const notas = new Map<string, Grade>([
        ['Meta 1', 'MA'],  // 1 * 10 = 10
        ['Meta 2', 'MPA'], // 2 * 7 = 14
        // Meta 3 não tem nota
      ]);
      
      // O método calc usa apenas as metas que têm notas
      const media = especificacao.calc(notas);
      
      // (10 + 14) / (1 + 2 + 3) = 24 / 6 = 4
      expect(media).toBe(4);
    });
  });

  /*
  // Teste 6: Relatório da turma deve considerar a especificação
  it('deve gerar relatório considerando a especificação da turma', async () => {
    // Criar turma
    const createResponse = await request(app)
      .post('/api/classes')
      .send({
        topic: 'Turma Relatório',
        semester: 1,
        year: 2024
      });

    const classId = createResponse.body.id;

    // Criar e matricular mais alunos
    const alunos = [
      new Student('Aluno A', '222.333.444-55', 'a@teste.com'),
      new Student('Aluno B', '333.444.555-66', 'b@teste.com'),
      new Student('Aluno C', '444.555.666-77', 'c@teste.com')
    ];

    alunos.forEach(aluno => {
      studentSet.addStudent(aluno);
    });

    // Matricular alunos
    for (const aluno of alunos) {
      await request(app)
        .post(`/api/classes/${classId}/enroll`)
        .send({
          studentCPF: aluno.getCPF()
        });
    }

    // Gerar relatório
    const response = await request(app)
      .get(`/api/classes/${classId}/report`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('class');
    expect(response.body).toHaveProperty('statistics');
    
    // O relatório deve incluir a especificação
    expect(response.body.class.especificacaoDoCalculoDaMedia).toBeDefined();
  });
  */

  // Teste 8: Atualização de turma mantém especificação
  it('deve manter a especificação ao atualizar uma turma', async () => {
    // Criar turma
    const createResponse = await request(app)
      .post('/api/classes')
      .send({
        topic: 'Turma Original',
        semester: 1,
        year: 2024
      });

    const classId = createResponse.body.id;
    const especificacaoOriginal = createResponse.body.especificacaoDoCalculoDaMedia;

    // Atualizar turma
    const updateResponse = await request(app)
      .put(`/api/classes/${classId}`)
      .send({
        topic: 'Turma Atualizada',
        semester: 2,
        year: 2025
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.topic).toBe('Turma Atualizada');
    
    // A especificação deve permanecer a mesma
    expect(updateResponse.body.especificacaoDoCalculoDaMedia).toEqual(especificacaoOriginal);
  });
});