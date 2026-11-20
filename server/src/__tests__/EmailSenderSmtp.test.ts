import nodemailer from 'nodemailer';
import { EmailSenderSmtp } from '../models/EmailSender';

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
