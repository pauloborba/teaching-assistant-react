import request from 'supertest';
import { app, classes, resultadosService, studentSet } from '../server';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS, Grade } from '../models/Evaluation';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';

const enviados: { destinatario: string; assunto: string; conteudo: string }[] = [];
resultadosService.usarEnviador({
  send(destinatario, assunto, conteudo) {
    enviados.push({ destinatario, assunto, conteudo });
    return { aceito: true };
  }
});

const TURMA = 'Engenharia de Software e Sistemas-2026-2';
const url = (caminho: string) => `/api/classes/${encodeURIComponent(TURMA)}${caminho}`;

let turma: Class;

const matricular = (nome: string, cpf: string, email: string, conceito: Grade | null, excecoes: Record<string, Grade | null> = {}) => {
  const aluno = studentSet.addStudent(new Student(nome, cpf, email));
  const matricula = turma.addEnrollment(aluno);
  if (conceito) {
    for (const meta of EVALUATION_GOALS) {
      const nota = meta in excecoes ? excecoes[meta] : conceito;
      if (nota) matricula.addOrUpdateEvaluation(meta, nota);
    }
  }
  return matricula;
};

describe('API de resultados finais', () => {
  beforeEach(() => {
    enviados.length = 0;
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    turma = classes.addClass(new Class('Engenharia de Software e Sistemas', new PeriodoAcademico(2026, 2), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
  });

  it('lista média, resultado, pendências e status de envio de cada aluno', async () => {
    matricular('Maria Silva', '11111111111', 'maria@cin.ufpe.br', 'MPA');
    matricular('João Souza', '22222222222', 'joao@cin.ufpe.br', 'MA', { Tests: null });

    const resposta = await request(app).get(url('/resultados'));

    expect(resposta.status).toBe(200);
    expect(resposta.body.turma).toMatchObject({ disciplina: 'Engenharia de Software e Sistemas', periodo: '2026.2', professor: 'Paulo Borba' });
    expect(resposta.body.alunos).toEqual([
      expect.objectContaining({ nome: 'Maria Silva', media: 7, resultado: 'Aprovado', statusEnvio: 'Não enviado', metasPendentes: [] }),
      expect.objectContaining({ nome: 'João Souza', media: null, resultado: null, metasPendentes: ['Tests'] })
    ]);
    expect(JSON.stringify(resposta.body)).not.toContain('maria@cin.ufpe.br');
  });

  it('libera o envio para a turma e informa os alunos com notas pendentes', async () => {
    matricular('Maria Silva', '11111111111', 'maria@cin.ufpe.br', 'MA');
    matricular('João Souza', '22222222222', 'joao@cin.ufpe.br', 'MA', { Tests: null });

    const resposta = await request(app).post(url('/resultados/envio')).send({});

    expect(resposta.status).toBe(200);
    expect(resposta.body.relatorio.enviados).toEqual([{ cpf: '11111111111', aluno: 'Maria Silva' }]);
    expect(resposta.body.relatorio.semResultado).toEqual([{ cpf: '22222222222', aluno: 'João Souza', metasPendentes: ['Tests'] }]);
    expect(resposta.body.alunos.map((a: any) => a.statusEnvio)).toEqual(['Enviado', 'Não enviado']);
    expect(enviados.map(e => e.destinatario)).toEqual(['maria@cin.ufpe.br']);
  });

  it('responde 409 ao tentar reenviar individualmente um resultado já enviado', async () => {
    matricular('Pedro Silva', '33333333333', 'pedro@cin.ufpe.br', 'MA');
    await request(app).post(url('/resultados/envio')).send({ alunos: ['333.333.333-33'] });

    const resposta = await request(app).post(url('/resultados/envio'))
      .send({ alunos: ['333.333.333-33'] });

    expect(resposta.status).toBe(409);
    expect(resposta.body.error).toBe('O e-mail com o resultado final deste aluno já foi enviado');
    expect(enviados).toHaveLength(1);
  });

  it('pré-visualiza e envia o conteúdo editado', async () => {
    matricular('Pedro Silva', '33333333333', 'pedro@cin.ufpe.br', 'MA');

    const previa = await request(app).get(url('/resultados/333.333.333-33/previa'));
    expect(previa.status).toBe(200);
    expect(previa.body.conteudo).toContain('Corretor: Paulo Borba');

    const editado = `${previa.body.conteudo}\n\nParabéns pela dedicação durante o semestre!`;
    const resposta = await request(app).post(url('/resultados/envio')).send({
      alunos: ['333.333.333-33'], conteudos: { '333.333.333-33': editado }
    });

    expect(resposta.status).toBe(200);
    expect(enviados[0].conteudo).toBe(editado);
  });

  it('envia e-mail de atualização quando a alteração de um conceito muda o resultado já enviado', async () => {
    matricular('Maria Silva', '11111111111', 'maria@cin.ufpe.br', 'MPA');
    await request(app).post(url('/resultados/envio')).send({});

    const semMudanca = await request(app).put(url('/enrollments/11111111111/evaluation')).send({ goal: 'Tests', grade: 'MA' });
    expect(semMudanca.body.mediaPreFinal).toBeCloseTo(7.5);
    expect(semMudanca.body.resultadoFinal).toBe('Aprovado');
    expect(semMudanca.body.atualizacaoResultado).toBeNull();

    const comMudanca = await request(app).put(url('/enrollments/11111111111/evaluation')).send({ goal: 'Tests', grade: 'MANA' });
    expect(comMudanca.body.resultadoFinal).toBe('Final');
    expect(comMudanca.body.atualizacaoResultado).toEqual({
      aluno: 'Maria Silva', resultadoAnterior: 'Aprovado', resultadoNovo: 'Final', enviado: true
    });
    expect(enviados.filter(e => e.assunto.startsWith('Atualização'))).toHaveLength(1);
  });

  it('cadastra a nota da prova final e envia a atualização do resultado', async () => {
    // (4 + 4 + 7 + 7 + 7 + 7) / 6 = 6,0
    matricular('Ana Lima', '44444444444', 'ana.lima@cin.ufpe.br', 'MPA', { Requirements: 'MANA', Tests: 'MANA' });
    await request(app).post(url('/resultados/envio')).send({});

    const resposta = await request(app).put(url('/enrollments/444.444.444-44/prova-final')).send({ nota: 4 });

    expect(resposta.status).toBe(200);
    expect(resposta.body.aluno).toMatchObject({ mediaFinal: 5, resultado: 'Aprovado na final', statusEnvio: 'Enviado' });
    expect(resposta.body.atualizacaoResultado).toMatchObject({ resultadoAnterior: 'Final', resultadoNovo: 'Aprovado na final', enviado: true });
  });

  it('recusa nota da prova final fora de 0 a 10', async () => {
    matricular('Ana Lima', '44444444444', 'ana.lima@cin.ufpe.br', 'MPA', { Requirements: 'MANA', Tests: 'MANA' });

    const resposta = await request(app).put(url('/enrollments/44444444444/prova-final')).send({ nota: 11 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toBe('A nota da prova final deve estar entre 0 e 10');
  });
});
