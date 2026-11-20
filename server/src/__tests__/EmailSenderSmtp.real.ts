import { EmailSenderSmtp } from '../models/EmailSender';

// Executado separadamente para validar a aceitação SMTP do Gmail.
describe('EmailSenderSmtp com Gmail', () => {
  it('recebe a confirmação SMTP para uma mensagem de notas pendentes', async () => {
    const destinatario = process.env.EMAIL_SMTP_TEST_TO?.trim();
    if (!destinatario) {
      throw new Error('Informe EMAIL_SMTP_TEST_TO antes de rodar o teste real.');
    }

    const assunto = '[Teste de integração] Notas pendentes — 2026.2 de ESS';
    const conteudo = [
      'Mensagem de teste do Teaching Assistant React.',
      '',
      'Turma: 2026.2 de ESS',
      'Motivo: Notas pendentes',
      'Pendência fictícia: Estudante de teste — Projeto 1.',
      'Prazo acadêmico: 31/08/2026 às 23:59.'
    ].join('\n');

    const resultado = await new EmailSenderSmtp().send(destinatario, assunto, conteudo);
    expect(resultado).toEqual({ aceito: true });
  }, 70_000);
});
