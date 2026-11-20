import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'node:test';
import { launch, type Browser, type Page } from 'puppeteer';

const tags = '@lembretes-configuracao-gui';
const fuso = 'America/Sao_Paulo';
const telaLembretes = '[aria-labelledby="reminder-settings-title"]';

let pasta: string | undefined;
let servidor: Server | undefined;
let navegador: Browser | undefined;
let pagina: Page;
let api: string;
let rotaLembretes: string;
let ano: string;
let semestre: string;
let turmaSelecionada: string;
let relogioAtivo = false;
let configuracaoAnterior: unknown;

// Converte o texto do cenário no formato local aceito pelo campo.
function dataParaCampo(data: string): string {
  const [dia, mes, ano, horario] = data.split(/\/| às /);
  return `${ano}-${mes}-${dia}T${horario}`;
}

async function requisitar(
  metodo: string,
  rota: string,
  status: number,
  corpo?: object
): Promise<Response> {
  const resposta = await fetch(`${api}${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  assert.equal(resposta.status, status, `${metodo} ${rota}`);
  return resposta;
}

async function clicar(texto: string): Promise<void> {
  const alvo = await pagina.waitForFunction(nome =>
    Array.from(document.querySelectorAll('button')).find(botao =>
      botao.textContent?.trim() === nome && !botao.disabled
    ), {}, texto);
  const elemento = alvo.asElement();
  assert(elemento);
  const botao = await elemento.toElement('button'); // Confirma a tag antes de clicar.
  await botao.click();
}

async function preencher(seletor: string, valor: string): Promise<void> {
  await pagina.waitForSelector(`${seletor}:enabled`);
  await pagina.$eval(seletor, (campo, texto) => {
    // O setter nativo permite ao React detectar a alteração do campo.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      ?.set?.call(campo, texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }, valor);
}

async function conferirTexto(seletor: string, esperado: string): Promise<void> {
  await pagina.waitForFunction((alvo, texto) =>
    document.querySelector(alvo)?.textContent?.trim() === texto,
  {}, seletor, esperado);
}

Before({ tags, timeout: 30_000 }, async function () {
  pasta = mkdtempSync(join(tmpdir(), 'ta-lembretes-gui-'));
  const anterior = process.cwd();
  const caminhoServidor = require.resolve('../../../server/src/server');

  // O servidor resolve o caminho do arquivo de dados na inicialização.
  const http = (() => {
    process.chdir(pasta);
    try {
      delete require.cache[caminhoServidor];
      return createServer(require(caminhoServidor).app);
    } finally {
      process.chdir(anterior);
    }
  })();
  servidor = http;

  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve); // Escolhe uma porta livre para a API de teste.
  });
  const endereco = http.address();
  assert(endereco && typeof endereco !== 'string');
  api = `http://127.0.0.1:${endereco.port}`;
});

After({ tags, timeout: 30_000 }, async function () {
  try {
    await navegador?.close();
  } finally {
    try {
      if (servidor) {
        await new Promise<void>(resolve => servidor!.close(() => resolve()));
      }
    } finally {
      if (relogioAtivo) mock.timers.reset();
      if (pasta) rmSync(pasta, { recursive: true, force: true });
      navegador = undefined;
      servidor = undefined;
      pasta = undefined;
      relogioAtivo = false;
    }
  }
});

Given('a data atual é {string}', { timeout: 30_000 }, async (data: string) => {
  const agora = new Date(dataParaCampo(data));
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, fuso);
  mock.timers.enable({ apis: ['Date'], now: agora });
  relogioAtivo = true;

  navegador = await launch({
    executablePath: process.env.CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  pagina = await navegador.newPage();
  await pagina.emulateTimezone(fuso);
  await pagina.evaluateOnNewDocument((origem, instante) => {
    // Redireciona as chamadas da interface para o servidor temporário.
    const fetchOriginal = window.fetch.bind(window);
    const apiPadrao = 'http://localhost:3005';
    window.fetch = (entrada, opcoes) => fetchOriginal(
      typeof entrada === 'string' && entrada.startsWith(`${apiPadrao}/`)
        ? origem + entrada.slice(apiPadrao.length)
        : entrada,
      opcoes
    );

    // Fixa o relógio do navegador no mesmo instante usado pelo servidor.
    window.Date = new Proxy(window.Date, {
      construct(alvo, args, construtor) {
        return Reflect.construct(alvo, args.length ? args : [instante], construtor);
      },
      apply(alvo) {
        return new alvo(instante).toString();
      },
      get(alvo, chave, receptor) {
        return chave === 'now' ? () => instante : Reflect.get(alvo, chave, receptor);
      }
    });
  }, api, agora.getTime());
});

Given('há um e-mail válido cadastrado em {string}', async (campo: string) => {
  assert.equal(campo, 'E-mail para as turmas');
  const emailDasTurmas = 'contato@example.com';
  const resposta = await requisitar('PUT', '/api/classes/email', 200, { emailDasTurmas });
  assert.deepEqual(await resposta.json(), { emailDasTurmas });
});

Given(
  'o professor {string} está na tela {string}, onde possui acesso à turma {string}, pela qual é responsável',
  { timeout: 30_000 },
  async (_professor: string, tela: string, turma: string) => {
    assert.equal(tela, 'Turmas');
    const identificacao = /^(\d{4})\.([12]) de (.+)$/.exec(turma);
    assert(identificacao, `Identificação de turma inválida: ${turma}`);
    const [, anoDaTurma, semestreDaTurma, topic] = identificacao;

    ano = anoDaTurma;
    semestre = semestreDaTurma;
    turmaSelecionada = turma;
    const resposta = await requisitar('POST', '/api/classes', 201, {
      topic, year: Number(ano), semester: Number(semestre)
    });
    const { id } = await resposta.json();
    rotaLembretes = `/api/classes/${encodeURIComponent(id)}/lembretes`;

    await pagina.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' });
    await clicar('Classes');
    await conferirTexto('.classes-container h2', 'Class Management');
  }
);

Given('a turma {string} não possui lembretes configurados', async (turma: string) => {
  assert.equal(turma, turmaSelecionada);
  const resposta = await requisitar('GET', rotaLembretes, 200);
  assert.deepEqual((await resposta.json()).lembretes, []);
});

Given('o prazo acadêmico da turma {string} é {string}', async (turma: string, data: string) => {
  assert.equal(turma, turmaSelecionada);
  const prazoAcademico = new Date(dataParaCampo(data)).toISOString();
  await requisitar('PUT', `/api/periodos-academicos/${ano}/${semestre}`, 200, { prazoAcademico });
});

When('{string} acessa a tela {string} da turma {string}',
  async (_professor: string, tela: string, turma: string) => {
    assert.equal(turma, turmaSelecionada);
    await clicar('Configurar lembretes');
    await conferirTexto('#reminder-settings-title', tela);
  });

When('informa {string} como quantidade de lembretes', (quantidade: string) =>
  preencher('#reminder-count', quantidade)
);

When(/^define o (primeiro|segundo) lembrete para "([^"]+)"$/, (ordem: string, data: string) => {
  const indice = ordem === 'primeiro' ? 0 : 1;
  return preencher(`#reminder-date-${indice}`, dataParaCampo(data));
});

When('salva a configuração', () => clicar('Salvar configuração'));

Then('{string} permanece na tela {string} da turma {string}',
  async (_professor: string, tela: string, turma: string) => {
    await conferirTexto('#reminder-settings-title', tela);
    await conferirTexto(`${telaLembretes} > p > strong`, turma);
  });

Then('a tela apresenta a confirmação {string}', (mensagem: string) =>
  conferirTexto(`${telaLembretes} [role="status"]`, mensagem)
);

Then('a quantidade de lembretes configurados é {string}', (quantidade: string) =>
  conferirTexto('#saved-reminders-title + p', `Quantidade de lembretes: ${quantidade}`)
);

Then(/^o (primeiro|segundo) lembrete está programado para "([^"]+)"$/, (ordem: string, data: string) => {
  const posicao = ordem === 'primeiro' ? 1 : 2;
  return conferirTexto(`${telaLembretes} ol li:nth-child(${posicao})`, data);
});

Then('o prazo acadêmico apresentado é {string}', (prazo: string) =>
  conferirTexto(`${telaLembretes} > p:nth-of-type(2) > strong`, prazo)
);

Given('a turma {string} possui um lembrete não enviado para {string}',
  async (turma: string, data: string) => {
    assert.equal(turma, turmaSelecionada);
    const instante = new Date(dataParaCampo(data)).toISOString();

    // Prepara a configuração salva pela mesma API usada pela tela.
    const resposta = await requisitar('PUT', rotaLembretes, 200, {
      quantidade: 1,
      lembretes: [{
        id: 'lembrete-existente',
        data: instante.slice(0, 10),
        horario: instante.slice(11, 16)
      }]
    });
    configuracaoAnterior = await resposta.json();
  });

When('deixa o terceiro lembrete sem data e horário', async () => {
  // Confere que o campo foi criado e que permanece vazio antes do envio.
  await pagina.waitForFunction(() =>
    document.querySelector<HTMLInputElement>('#reminder-date-2')?.value === ''
  );
});

Then('a tela apresenta o erro {string}', (mensagem: string) =>
  conferirTexto(`${telaLembretes} [role="alert"]`, mensagem)
);

Then('a configuração gravada permanece igual à anterior', async () => {
  // Confere também a API para detectar alterações que o resumo da tela poderia ocultar.
  const resposta = await requisitar('GET', rotaLembretes, 200);
  assert.deepEqual(await resposta.json(), configuracaoAnterior);
});
