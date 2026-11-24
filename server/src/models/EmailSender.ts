import nodemailer, {
  type SMTPSentMessageInfo,
  type SMTPTransportOptions,
  type Transporter
} from 'nodemailer';

/**
 * Retorno de send: informa a aceitação pelo serviço de email ou a falha com a
 * descrição do erro. Aceitação não significa entrega nem leitura.
 */
export interface ResultadoEnvio {
  aceito: boolean;
  descricaoFalha?: string;
}

/** Contrato de EmailSender do modelo: send(destinatario, assunto, conteudo). */
export interface EmailSender {
  send(destinatario: string, assunto: string, conteudo: string): ResultadoEnvio;
}

/**
 * Implementação simulada (stub): aceita todo envio e guarda as mensagens.
 * É usada pelo fluxo síncrono de grupos e monitores.
 */
export class EmailSenderSimulado implements EmailSender {
  readonly enviados: { destinatario: string; assunto: string; conteudo: string }[] = [];

  send(destinatario: string, assunto: string, conteudo: string): ResultadoEnvio {
    this.enviados.push({ destinatario, assunto, conteudo });
    return { aceito: true };
  }
}

// O serviço recebe um endereço simples por chamada, sem lista ou nome de exibição.
const ENDERECO_EMAIL = /^[^\s@<>,;:"()]+@[^\s@<>,;:"()]+$/u;

/**
 * Envia mensagens em texto simples pelo Gmail SMTP.
 *
 * Reutilize a instância para enviar mensagens. Quando recebe um ambiente
 * explícito, configura o transporte imediatamente; sem ele, lê as credenciais
 * do ambiente no primeiro envio.
 */
export class EmailSenderSmtp {
  private remetente: string | undefined;
  private transporte: Transporter<SMTPSentMessageInfo, SMTPTransportOptions> | undefined;
  private readonly ambiente: NodeJS.ProcessEnv | undefined;

  constructor(ambiente?: NodeJS.ProcessEnv) {
    this.ambiente = ambiente;
    if (ambiente) this.configurarTransporte(ambiente);
  }

  private configurarTransporte(ambiente: NodeJS.ProcessEnv = process.env): void {
    if (this.transporte) return;

    const remetente = ambiente.GMAIL_USER?.trim();
    const senha = ambiente.GMAIL_APP_PASSWORD?.replace(/\s/g, ''); // Aceita a senha de app copiada em grupos separados por espaços.
    if (!remetente) {
      throw new Error('Configure GMAIL_USER para enviar e-mails.');
    }
    if (!senha) {
      throw new Error('Configure GMAIL_APP_PASSWORD para enviar e-mails.');
    }

    this.remetente = remetente;
    this.transporte = nodemailer.createTransport({
      service: 'gmail', // Usa a configuração SMTP do Gmail fornecida pelo Nodemailer.
      auth: { user: remetente, pass: senha },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000
    });
  }

  /**
   * Solicita o envio de uma mensagem já preparada pelo chamador.
   * @param destinatario Um único endereço de e-mail.
   * @param assunto Assunto da mensagem.
   * @param conteudo Corpo da mensagem em texto simples.
   * @returns Aceitação pelo SMTP ou falha com a respectiva descrição.
   * A aceitação indica que o Gmail recebeu a solicitação de envio.
   * A entrega é verificada na caixa do destinatário.
   */
  async send(destinatario: string, assunto: string, conteudo: string): Promise<ResultadoEnvio> {
    const endereco = destinatario.trim();
    if (!ENDERECO_EMAIL.test(endereco)) {
      return { aceito: false, descricaoFalha: 'Informe um único endereço de e-mail válido.' };
    }

    try {
      this.configurarTransporte(this.ambiente);
      if (!this.remetente || !this.transporte) {
        throw new Error('Não foi possível configurar o transporte SMTP.');
      }

      const resultado = await this.transporte.sendMail({
        from: this.remetente,
        to: { address: endereco, name: '' },
        subject: assunto,
        text: conteudo
      });

      // O SMTP confirma a aceitação do envio. O recebimento é conferido na caixa de destino.
      if (resultado.accepted.length === 1) {
        return { aceito: true };
      }
      return { aceito: false, descricaoFalha: 'O servidor SMTP não aceitou o destinatário.' };
    } catch (erro) {
      // Traduz códigos conhecidos e evita repassar mensagens do provedor ao chamador.
      const codigo = erro instanceof Error && 'code' in erro ? erro.code : undefined;
      if (codigo === 'EAUTH') {
        return { aceito: false, descricaoFalha: 'O Gmail recusou a autenticação do remetente.' };
      }
      if (codigo === 'ETIMEDOUT') {
        return { aceito: false, descricaoFalha: 'Tempo limite excedido na comunicação com o SMTP.' };
      }
      if (erro instanceof Error && 'command' in erro && erro.command === 'RCPT TO') {
        return { aceito: false, descricaoFalha: 'O servidor SMTP não aceitou o destinatário.' };
      }
      if (erro instanceof Error && erro.message.startsWith('Configure GMAIL_')) {
        return { aceito: false, descricaoFalha: erro.message };
      }
      return { aceito: false, descricaoFalha: 'Falha ao enviar a mensagem pelo servidor SMTP.' };
    }
  }
}
