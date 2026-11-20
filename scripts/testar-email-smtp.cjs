const assunto = '[Teste manual] Notas pendentes — 2026.2 de ESS';
const conteudo = [
  'Mensagem de teste do Teaching Assistant React.',
  '',
  'Turma: 2026.2 de ESS',
  'Motivo: Notas pendentes',
  'Pendência fictícia: Estudante de teste — Projeto 1.',
  'Prazo acadêmico: 31/08/2026 às 23:59.'
].join('\n');

async function executar() {
  const [endereco, acao, ...extras] = process.argv.slice(2);
  const destinatario = endereco?.trim();
  if (!destinatario || extras.length > 0 || (acao !== undefined && acao !== '--enviar')) {
    console.error('Uso: node scripts/testar-email-smtp.cjs <destinatário> [--enviar]');
    process.exitCode = 1;
    return;
  }

  console.log('Destinatário: ' + destinatario);
  console.log('Assunto: ' + assunto);
  console.log('Corpo:\n' + conteudo);

  // Sem a opção explícita de envio, o comando só exibe a mensagem.
  if (acao !== '--enviar') {
    console.log('\nPrévia: nenhum e-mail foi enviado.');
    return;
  }

  const { EmailSenderSmtp } = require('../server/dist/models/EmailSender');
  const resultado = await new EmailSenderSmtp().send(destinatario, assunto, conteudo);
  if (!resultado.aceito) {
    console.error(resultado.descricaoFalha ?? 'O SMTP não aceitou o envio.');
    process.exitCode = 1;
    return;
  }

  console.log('O Gmail aceitou a mensagem. Confira a caixa de entrada ou o spam.');
}

executar().catch(erro => {
  console.error(erro instanceof Error ? erro.message : 'Falha ao preparar o envio de teste.');
  process.exitCode = 1;
});
