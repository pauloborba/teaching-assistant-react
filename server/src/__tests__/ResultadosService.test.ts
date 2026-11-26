import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS, Grade } from '../models/Evaluation';
import { Enrollment } from '../models/Enrollment';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { calcularResultadoFinal } from '../models/ResultadoFinal';
import { ResultadosService } from '../models/ResultadosService';
import { Student } from '../models/Student';

/** Serviço de e-mail falso: guarda os e-mails aceitos e recusa os endereços configurados. */
class EnviadorFalso {
  readonly enviados: { destinatario: string; assunto: string; conteudo: string }[] = [];
  readonly recusas = new Map<string, string>();
  atrasoMs = 0;

  async send(destinatario: string, assunto: string, conteudo: string) {
    if (this.atrasoMs) await new Promise(resolve => setTimeout(resolve, this.atrasoMs));
    const falha = this.recusas.get(destinatario);
    if (falha) return { aceito: false, descricaoFalha: falha };
    this.enviados.push({ destinatario, assunto, conteudo });
    return { aceito: true };
  }

  para(destinatario: string) {
    return this.enviados.filter(e => e.destinatario === destinatario);
  }
}

// 31/08/2026 às 23:59 em horário de Brasília
const PRAZO = new Date('2026-08-31T23:59:00-03:00');

let cpfSequencial = 0;
const semAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const novoAluno = (nome: string, email = `${semAcentos(nome.split(' ')[0].toLowerCase())}@cin.ufpe.br`) =>
  new Student(nome, `1234567890${cpfSequencial++ % 10}`, email);

/** Lança o mesmo conceito em todas as metas, exceto as exceções (null deixa a meta pendente). */
const lancarNotas = (matricula: Enrollment, conceito: Grade, excecoes: Record<string, Grade | null> = {}) => {
  for (const meta of EVALUATION_GOALS) {
    const nota = meta in excecoes ? excecoes[meta] : conceito;
    if (nota) matricula.addOrUpdateEvaluation(meta, nota);
  }
};

describe('ResultadoFinal - regras do resultado', () => {
  it.each([
    [7, null, false, 'Aprovado'],
    [6.9, null, false, 'Final'],
    [3, null, false, 'Final'],
    [2.9, null, false, 'Reprovado'],
    [6, 4, false, 'Aprovado na final'],
    [6, 3.9, false, 'Reprovado na final'],
    [9.5, null, true, 'Reprovado por falta'],
    [null, null, false, null]
  ] as const)('média %p, prova final %p, falta %p: %p', (media, final, falta, esperado) => {
    expect(calcularResultadoFinal(media, final, falta)).toBe(esperado);
  });
});

describe('ResultadosService - envio dos resultados finais', () => {
  let turma: Class;
  let enviador: EnviadorFalso;
  let servico: ResultadosService;

  const matricular = (nome: string, email?: string): Enrollment => turma.addEnrollment(novoAluno(nome, email));

  beforeEach(() => {
    cpfSequencial = 0;
    turma = new Class('Engenharia de Software e Sistemas', new PeriodoAcademico(2026, 2, PRAZO), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    enviador = new EnviadorFalso();
    servico = new ResultadosService(() => enviador);
  });

  // GUI: Liberação do envio dos resultados para toda a turma
  it('libera o envio para toda a turma: cada aluno recebe apenas o próprio resultado', async () => {
    const maria = matricular('Maria Silva');
    const joao = matricular('João Souza');
    lancarNotas(maria, 'MA');
    lancarNotas(joao, 'MPA', { Tests: 'MANA' });

    const relatorio = await servico.liberarEnvio(turma);

    expect(relatorio.enviados.map(a => a.aluno)).toEqual(['Maria Silva', 'João Souza']);
    expect(relatorio.falhas).toEqual([]);
    expect(enviador.para('maria@cin.ufpe.br')[0].conteudo).toContain('é: Aprovado.');
    expect(enviador.para('joao@cin.ufpe.br')[0].conteudo).toContain('é: Final.');
    expect(enviador.para('maria@cin.ufpe.br')[0].conteudo).not.toContain('João Souza');
    expect(maria.getEnvioResultado().status).toBe('Enviado');
    expect(joao.getEnvioResultado().status).toBe('Enviado');
  });

  // GUI: Bloqueio do envio apenas para alunos com notas pendentes
  it('não envia para aluno com notas pendentes, sem impedir os demais', async () => {
    const maria = matricular('Maria Silva');
    const joao = matricular('João Souza');
    lancarNotas(maria, 'MA');
    lancarNotas(joao, 'MA', { Tests: null });

    const relatorio = await servico.liberarEnvio(turma);

    expect(relatorio.enviados.map(a => a.aluno)).toEqual(['Maria Silva']);
    expect(relatorio.semResultado).toEqual([{ cpf: joao.getStudent().getCPF(), aluno: 'João Souza', metasPendentes: ['Tests'] }]);
    expect(enviador.para('joao@cin.ufpe.br')).toHaveLength(0);
    expect(maria.getEnvioResultado().status).toBe('Enviado');
    expect(joao.getEnvioResultado().status).toBe('Não enviado');
  });

  // GUI: Envio individual apenas para os alunos selecionados
  it('envia apenas para os alunos selecionados', async () => {
    const maria = matricular('Maria Silva');
    const joao = matricular('João Souza');
    const pedro = matricular('Pedro Silva');
    [maria, joao, pedro].forEach(m => lancarNotas(m, 'MA'));

    await servico.liberarEnvio(turma, {
      cpfs: [maria.getStudent().toJSON().cpf, pedro.getStudent().getCPF()]
    });

    expect(enviador.enviados.map(e => e.destinatario)).toEqual(['maria@cin.ufpe.br', 'pedro@cin.ufpe.br']);
    expect(joao.getEnvioResultado().status).toBe('Não enviado');
    expect(pedro.getEnvioResultado().status).toBe('Enviado');
  });

  // GUI: Edição do conteúdo do e-mail antes da liberação do envio
  it('usa o conteúdo editado pelo professor na pré-visualização', async () => {
    const pedro = matricular('Pedro Silva');
    lancarNotas(pedro, 'MA');
    const previa = servico.previsualizar(turma, pedro.getStudent().getCPF());
    const editado = `${previa.conteudo}\n\nParabéns pela dedicação durante o semestre!`;

    await servico.liberarEnvio(turma, {
      cpfs: [pedro.getStudent().getCPF()],
      conteudos: { [pedro.getStudent().toJSON().cpf]: editado }
    });

    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.enviados[0].conteudo).toContain('é: Aprovado.');
    expect(enviador.enviados[0].conteudo).toContain('Parabéns pela dedicação durante o semestre!');
    expect(pedro.getEnvioResultado().status).toBe('Enviado');
  });

  // GUI: Mensagem de erro quando um envio falha + Nova tentativa apenas para os pendentes
  it('deixa pendente o aluno sem e-mail e, na nova tentativa, envia só para ele', async () => {
    const joao = matricular('João Souza', 'joao@cin.ufpe.br');
    const ana = matricular('Ana Lima', '');
    lancarNotas(joao, 'MA');
    lancarNotas(ana, 'MPA', { Tests: 'MANA' });

    const primeiro = await servico.liberarEnvio(turma);
    expect(primeiro.enviados.map(a => a.aluno)).toEqual(['João Souza']);
    expect(primeiro.falhas).toEqual([{ cpf: ana.getStudent().getCPF(), aluno: 'Ana Lima', motivo: 'não possui e-mail cadastrado' }]);
    expect(joao.getEnvioResultado().status).toBe('Enviado');
    expect(ana.getEnvioResultado().status).toBe('Pendente');

    ana.getStudent().email = 'ana.lima@cin.ufpe.br';
    const novaTentativa = await servico.liberarEnvio(turma, { somentePendentes: true });

    expect(novaTentativa.enviados.map(a => a.aluno)).toEqual(['Ana Lima']);
    expect(ana.getEnvioResultado().status).toBe('Enviado');
    expect(enviador.para('joao@cin.ufpe.br')).toHaveLength(1);
  });

  // GUI: Bloqueio de reenvio individual de resultado já enviado
  it('não reenvia um resultado já enviado', async () => {
    const pedro = matricular('Pedro Silva');
    lancarNotas(pedro, 'MA');
    await servico.liberarEnvio(turma);

    const relatorio = await servico.liberarEnvio(turma, { cpfs: [pedro.getStudent().getCPF()] });

    expect(relatorio.jaEnviados.map(a => a.aluno)).toEqual(['Pedro Silva']);
    expect(relatorio.enviados).toEqual([]);
    expect(enviador.enviados).toHaveLength(1);
    expect(pedro.getEnvioResultado().status).toBe('Enviado');
  });

  // GUI: E-mail de atualização após mudança de resultado / sem mudança de resultado
  it('envia e-mail de atualização somente quando o resultado enviado muda', async () => {
    const maria = matricular('Maria Silva');
    lancarNotas(maria, 'MPA');
    expect(maria.getMediaPreFinal()).toBe(7);
    await servico.liberarEnvio(turma);

    maria.addOrUpdateEvaluation('Tests', 'MA');
    expect(maria.getMediaPreFinal()).toBeCloseTo(7.5);
    expect(await servico.notificarMudancaDeResultado(turma, maria)).toBeNull();
    expect(enviador.enviados).toHaveLength(1);

    maria.addOrUpdateEvaluation('Tests', 'MANA');
    const atualizacao = await servico.notificarMudancaDeResultado(turma, maria);

    expect(atualizacao).toEqual({ aluno: 'Maria Silva', resultadoAnterior: 'Aprovado', resultadoNovo: 'Final', enviado: true });
    expect(enviador.enviados).toHaveLength(2);
    expect(enviador.enviados[1].assunto).toContain('Atualização do resultado final');
    expect(enviador.enviados[1].conteudo).toContain('Resultado anterior: Aprovado.');
    expect(enviador.enviados[1].conteudo).toContain('Novo resultado: Final.');
    expect(maria.getEnvioResultado()).toEqual({ status: 'Enviado', resultadoEnviado: 'Final', motivoFalha: null });
  });

  it('não envia atualização para resultado ainda não liberado', async () => {
    const maria = matricular('Maria Silva');
    lancarNotas(maria, 'MPA');
    maria.addOrUpdateEvaluation('Tests', 'MANA');

    expect(await servico.notificarMudancaDeResultado(turma, maria)).toBeNull();
    expect(enviador.enviados).toHaveLength(0);
  });

  // Serviço: Envio automático dos resultados não enviados ao fim do período de correção
  it('envia automaticamente, depois do prazo, apenas os resultados definidos ainda não enviados', async () => {
    const maria = matricular('Maria Silva');
    const pedro = matricular('Pedro Silva');
    const joao = matricular('João Souza');
    lancarNotas(maria, 'MA');
    lancarNotas(pedro, 'MPA', { Tests: 'MANA' });
    pedro.registrarEnvioResultado('Final');
    lancarNotas(joao, 'MA', { Tests: null });

    const relatorio = await servico.verificarEnvioAutomatico(turma, new Date('2026-09-01T00:00:00-03:00'));

    expect(relatorio?.enviados.map(a => a.aluno)).toEqual(['Maria Silva']);
    expect(enviador.enviados.map(e => e.destinatario)).toEqual(['maria@cin.ufpe.br']);
    expect(maria.getEnvioResultado().status).toBe('Enviado');
    expect(joao.getEnvioResultado().status).toBe('Não enviado');
  });

  // Serviço: Resultado definido não é enviado automaticamente antes do fim do período de correção
  it('não envia automaticamente antes do fim do período de correção', async () => {
    const maria = matricular('Maria Silva');
    lancarNotas(maria, 'MA');

    expect(await servico.verificarEnvioAutomatico(turma, new Date('2026-08-31T23:58:00-03:00'))).toBeNull();
    expect(enviador.enviados).toHaveLength(0);
    expect(maria.getEnvioResultado().status).toBe('Não enviado');
  });

  // Serviço: Conteúdo do e-mail de resultado sem dados pessoais desnecessários
  it('o e-mail traz disciplina, período, corretor e resultado, sem CPF nem dados de outros alunos', async () => {
    const maria = matricular('Maria Silva');
    const joao = matricular('João Souza');
    lancarNotas(maria, 'MA');
    lancarNotas(joao, 'MPA', { Tests: 'MANA' });

    await servico.liberarEnvio(turma);
    const { assunto, conteudo } = enviador.para('maria@cin.ufpe.br')[0];
    const texto = `${assunto}\n${conteudo}`;

    expect(texto).toContain('Engenharia de Software e Sistemas');
    expect(texto).toContain('2026.2');
    expect(texto).toContain('Corretor: Paulo Borba');
    expect(texto).toContain('Aprovado');
    expect(texto).not.toContain(maria.getStudent().getCPF());
    expect(texto).not.toContain(maria.getStudent().toJSON().cpf);
    expect(texto).not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    expect(texto).not.toContain('João Souza');
    expect(texto).not.toContain('Final');
  });

  // Serviço: E-mail de atualização após o cadastro da nota da prova final
  it('envia atualização quando a nota da prova final muda o resultado', async () => {
    const ana = matricular('Ana Lima', 'ana.lima@cin.ufpe.br');
    const bruno = matricular('Bruno Costa');
    // (4 + 4 + 7 + 7 + 7 + 7) / 6 = 6,0
    lancarNotas(ana, 'MPA', { Requirements: 'MANA', Tests: 'MANA' });
    lancarNotas(bruno, 'MA');
    expect(ana.getMediaPreFinal()).toBe(6);
    ana.registrarEnvioResultado('Final');
    bruno.registrarEnvioResultado('Aprovado');

    ana.registrarNotaProvaFinal(4);
    const atualizacao = await servico.notificarMudancaDeResultado(turma, ana);

    expect(ana.getMediaPosFinal()).toBe(5);
    expect(ana.getResultadoFinal()).toBe('Aprovado na final');
    expect(atualizacao).toMatchObject({ resultadoAnterior: 'Final', resultadoNovo: 'Aprovado na final', enviado: true });
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.enviados[0].destinatario).toBe('ana.lima@cin.ufpe.br');
    expect(enviador.enviados[0].conteudo).toContain('Novo resultado: Aprovado na final.');
  });

  it('só aceita nota da prova final de aluno em prova final', () => {
    const maria = matricular('Maria Silva');
    lancarNotas(maria, 'MA');
    expect(() => maria.registrarNotaProvaFinal(5)).toThrow('O aluno não está em prova final');
  });

  // Serviço: Prevenção de envio duplicado por solicitações simultâneas
  it('envia um único e-mail por aluno mesmo com duas solicitações simultâneas', async () => {
    const maria = matricular('Maria Silva');
    const joao = matricular('João Souza');
    lancarNotas(maria, 'MA');
    lancarNotas(joao, 'MPA', { Tests: 'MANA' });
    enviador.atrasoMs = 20;

    await Promise.all([servico.liberarEnvio(turma), servico.liberarEnvio(turma)]);

    expect(enviador.para('maria@cin.ufpe.br')).toHaveLength(1);
    expect(enviador.para('joao@cin.ufpe.br')).toHaveLength(1);
    expect(maria.getEnvioResultado().status).toBe('Enviado');
    expect(joao.getEnvioResultado().status).toBe('Enviado');
  });

  // Serviço: Falha no envio para um aluno não interrompe o envio aos demais
  it('continua enviando aos demais quando o envio para um aluno falha', async () => {
    const ana = matricular('Ana Lima');
    const bruno = matricular('Bruno Costa');
    const carla = matricular('Carla Dias');
    [ana, bruno, carla].forEach(m => lancarNotas(m, 'MA'));
    enviador.recusas.set('ana@cin.ufpe.br', 'Tempo limite excedido na comunicação com o SMTP.');

    const relatorio = await servico.liberarEnvio(turma);

    expect(relatorio.enviados.map(a => a.aluno)).toEqual(['Bruno Costa', 'Carla Dias']);
    expect(relatorio.falhas).toEqual([
      { cpf: ana.getStudent().getCPF(), aluno: 'Ana Lima', motivo: 'o servidor de e-mail não respondeu a tempo' }
    ]);
    expect(ana.getEnvioResultado()).toMatchObject({ status: 'Pendente', motivoFalha: 'o servidor de e-mail não respondeu a tempo' });
    expect(bruno.getEnvioResultado().status).toBe('Enviado');
    expect(carla.getEnvioResultado().status).toBe('Enviado');
  });
});
