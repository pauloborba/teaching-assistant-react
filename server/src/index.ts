import { existsSync } from 'node:fs';
import { EmailSenderSimulado, EmailSenderSmtp } from './models/EmailSender';
import { NotificacaoService } from './models/NotificacaoService';
import { app, classes, historicoLembretes, saveDataToFile } from './server';

const PORT = 3005;

const servidor = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  let emailSender: EmailSenderSmtp;
  try {
    // O diretório de execução do backend contém o .env e os dados locais.
    if (existsSync('.env')) process.loadEnvFile('.env');
    emailSender = new EmailSenderSmtp(process.env);
  } catch {
    console.warn('Lembretes automáticos desativados. Verifique o .env e as variáveis GMAIL_USER e GMAIL_APP_PASSWORD.');
    return;
  }

  // Usa os mesmos dados que as rotas carregam e atualizam.
  const notificacoes = new NotificacaoService(historicoLembretes, new EmailSenderSimulado(), {
    classes,
    emailSender
  });
  servidor.once('close', notificacoes.iniciarVerificacaoDeLembretes(saveDataToFile));
});
