import nodemailer from 'nodemailer';
import { EmailSenderSmtp } from '../models/EmailSender';
import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';
import { NotificacaoService } from '../models/NotificacaoService';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail }))
}));

// Cobre somente a etapa de envio do cenário "Envio de lembrete com notas pendentes".
// O transporte é simulado para testar aceitação e falha sem acessar o Gmail.
describe('EmailSenderSmtp', () => {
  const ambiente = {
    GMAIL_USER: 'remetente@example.com',
    GMAIL_APP_PASSWORD: 'senha de teste'
  };
  const destinatario = 'professor@example.com';
  const assunto = 'Notas pendentes — 2026.2 de ESS';
  const conteudo = [
    'Turma: 2026.2 de ESS',
    'Motivo: Notas pendentes',
    'Pendência fictícia: Estudante de teste — Projeto 1.',
    'Prazo acadêmico: 31/08/2026 às 23:59.'
  ].join('\n');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockReset();
  });

  it('encaminha a mensagem pronta e informa a aceitação do destinatário', async () => {
    mockSendMail.mockResolvedValue({ accepted: [destinatario] });
    const sender = new EmailSenderSmtp(ambiente);

    await expect(sender.send(destinatario, assunto, conteudo)).resolves.toEqual({ aceito: true });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      service: 'gmail',
      auth: { user: ambiente.GMAIL_USER, pass: 'senhadeteste' }
    }));
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: ambiente.GMAIL_USER,
      to: { address: destinatario, name: '' },
      subject: assunto,
      text: conteudo
    });
  });

  it.each(['Maria Souza', 'João da Silva'])(
    'encaminha a mensagem com as metas agrupadas quando o segundo aluno se chama %s',
    async (nomeSegundoAluno) => {
      // Given: a turma tem prazo, destinatário compartilhado e três pendências.
      const prazo = new Date('2026-09-01T02:59:00.000Z');
      const classes = new Classes();
      classes.definirEmailDasTurmas(destinatario);
      const turma = classes.addClass(new Class(
        'ESS', new PeriodoAcademico(2026, 2, prazo), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
      ));
      const primeiro = turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
      const segundo = turma.addEnrollment(new Student(nomeSegundoAluno, '98765432101', 'segunda@example.test'));

      for (const meta of EVALUATION_GOALS) {
        if (meta !== 'Design' && meta !== 'Tests') primeiro.addOrUpdateEvaluation(meta, 'MA');
        if (meta !== 'Tests') segundo.addOrUpdateEvaluation(meta, 'MANA');
      }

      const endereco = classes.obterEmailDasTurmas();
      if (endereco === null) throw new Error('Destinatário do teste não configurado');
      mockSendMail.mockResolvedValue({ accepted: [endereco] });
      const sender = new EmailSenderSmtp(ambiente);

      // When: o teste monta a mensagem e a entrega ao transporte simulado.
      const mensagem = NotificacaoService.montarEmailNotasPendentes(turma, endereco, prazo);
      if (mensagem === null) throw new Error('O teste deveria gerar uma mensagem de pendências');
      const resultado = await sender.send(mensagem.destinatario, mensagem.assunto, mensagem.conteudo);

      // Then: o transporte recebe os dados aprovados e mantém os homônimos em linhas distintas.
      expect(resultado).toEqual({ aceito: true });
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: ambiente.GMAIL_USER,
        to: { address: destinatario, name: '' },
        subject: 'Notas pendentes — 2026.2 de ESS',
        text: [
          'Olá,',
          '',
          'Ainda há notas pendentes na turma 2026.2 de ESS.',
          '',
          '- João da Silva: Design, Tests',
          `- ${nomeSegundoAluno}: Tests`,
          '',
          'Prazo acadêmico para lançamento das notas: 31/08/2026 às 23:59 (horário de Brasília).'
        ].join('\n')
      });
    }
  );

  it('não monta mensagem quando todas as metas têm nota', () => {
    // Given: a matrícula tem nota em todas as metas, inclusive o conceito MANA.
    const prazo = new Date('2026-09-01T02:59:00.000Z');
    const turma = new Class(
      'ESS', new PeriodoAcademico(2026, 2, prazo), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    );
    const matricula = turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
    for (const meta of EVALUATION_GOALS) {
      matricula.addOrUpdateEvaluation(meta, 'MANA');
    }

    // When: solicita a montagem da mensagem.
    const mensagem = NotificacaoService.montarEmailNotasPendentes(turma, destinatario, prazo);

    // Then: o fluxo de processamento não terá uma mensagem de pendências para entregar ao transporte.
    expect(mensagem).toBeNull();
  });

  it('informa falha quando o transporte não aceita o destinatário', async () => {
    mockSendMail.mockResolvedValue({ accepted: [] });
    const sender = new EmailSenderSmtp(ambiente);

    await expect(sender.send(destinatario, assunto, conteudo)).resolves.toEqual({
      aceito: false,
      descricaoFalha: 'O servidor SMTP não aceitou o destinatário.'
    });
  });

  it.each([
    ['EENVELOPE', 'RCPT TO', 'O servidor SMTP não aceitou o destinatário.'],
    ['EAUTH', 'AUTH LOGIN', 'O Gmail recusou a autenticação do remetente.'],
    ['ETIMEDOUT', 'CONN', 'Tempo limite excedido na comunicação com o SMTP.'],
    ['ECONNECTION', 'CONN', 'Falha ao enviar a mensagem pelo servidor SMTP.']
  ])('traduz a falha %s sem repassar o erro original do provedor', async (code, command, descricaoFalha) => {
    mockSendMail.mockRejectedValue(Object.assign(new Error('Detalhe do provedor'), { code, command }));
    const sender = new EmailSenderSmtp(ambiente);

    await expect(sender.send(destinatario, assunto, conteudo)).resolves.toEqual({
      aceito: false,
      descricaoFalha
    });
  });

  it('rejeita uma lista de endereços antes de chamar o transporte', async () => {
    const sender = new EmailSenderSmtp(ambiente);

    await expect(sender.send('um@example.com,dois@example.com', assunto, conteudo)).resolves.toEqual({
      aceito: false,
      descricaoFalha: 'Informe um único endereço de e-mail válido.'
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it.each(['GMAIL_USER', 'GMAIL_APP_PASSWORD'] as const)(
    'identifica a variável %s quando não foi configurada',
    variavel => {
      expect(() => new EmailSenderSmtp({ ...ambiente, [variavel]: '' }))
        .toThrow('Configure ' + variavel + ' para enviar e-mails.');
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    }
  );
});
