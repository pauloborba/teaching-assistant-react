import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'node:test';
import { launch, type Browser, type Page } from 'puppeteer';
import type { ConfiguracaoLembretes } from '../types/Reminder';
import { Lembrete } from '../../../server/src/models/Lembrete';

// Tipifica a busca da turma e a inserção de registros históricos no servidor de teste.
interface ClassesDaApiDeTeste {
  findClassById(id: string): {
    obterConfiguracaoLembretes(): { add(lembrete: Lembrete): void };
  } | undefined;
}

type TurmaDoCenario = {
  id: string;
  topic: string;
  ano: string;
  semestre: string;
  rota: string;
  anterior?: ConfiguracaoLembretes;
};

// Guarda a rota e a configuração original de cada turma do cenário.
const turmasDoCenario = new Map<string, TurmaDoCenario>();

const tags = '@lembretes-configuracao-gui';
const fuso = 'America/Sao_Paulo';
const telaLembretes = '[aria-labelledby="reminder-settings-title"]';

let pasta: string | undefined;
let servidor: Server | undefined;
let navegador: Browser | undefined;
let pagina: Page;
let api: string;
let turmaSelecionada: string;
let relogioAtivo = false;

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

async function clicar(texto: string, celulasDaTurma: string[] = []): Promise<void> {
  const alvo = await pagina.waitForFunction((nome, celulas) =>
    Array.from(document.querySelectorAll('button')).find(botao => {
      // Quando há uma turma indicada, compara disciplina, ano e semestre na linha do botão.
      const linha = botao.closest('tr');
      return botao.textContent?.trim() === nome && !botao.disabled &&
        celulas.every((valor, indice) => linha?.cells[indice]?.textContent?.trim() === valor);
    }), {}, texto, celulasDaTurma);
  const elemento = alvo.asElement();
  assert(elemento);
  const botao = await elemento.toElement('button');
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

function obterTurmaDoCenario(nome: string): TurmaDoCenario {
  const turma = turmasDoCenario.get(nome);
  assert(turma, `Turma ainda não preparada: ${nome}`);
  return turma;
}

async function cadastrarTurmaDoCenario(nome: string): Promise<void> {
  const identificacao = /^(\d{4})\.([12]) de (.+)$/.exec(nome);
  assert(identificacao, `Identificação de turma inválida: ${nome}`);
  const [, ano, semestre, topic] = identificacao;

  const resposta = await requisitar('POST', '/api/classes', 201, {
    topic, year: Number(ano), semester: Number(semestre)
  });
  const { id } = await resposta.json();

  turmasDoCenario.set(nome, {
    id, topic, ano, semestre, rota: `/api/classes/${encodeURIComponent(id)}/lembretes`
  });
}

async function prepararLembretes(nome: string, datas: string[]): Promise<void> {
  const turma = obterTurmaDoCenario(nome);
  const lembretes = datas.map((data, indice) => {
    const instante = new Date(dataParaCampo(data)).toISOString();
    return {
      id: `lembrete-existente-${indice + 1}`,
      data: instante.slice(0, 10),
      horario: instante.slice(11, 16)
    };
  });

  // Guarda o retorno da API para comparar IDs, horários e estados depois do salvamento pela GUI.
  const resposta = await requisitar('PUT', turma.rota, 200, {
    quantidade: lembretes.length, lembretes
  });
  turma.anterior = await resposta.json();
}

Before({ tags, timeout: 30_000 }, async function () {
  turmasDoCenario.clear();
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
    await cadastrarTurmaDoCenario(turma);
    turmaSelecionada = turma;

    await pagina.goto('http://localhost:3004/', { waitUntil: 'domcontentloaded' });
    await clicar('Classes');
    await conferirTexto('.classes-container h2', 'Class Management');
  }
);

Given('a turma {string} também está cadastrada', cadastrarTurmaDoCenario);

Given('a turma {string} não possui lembretes configurados', async (turma: string) => {
  const { rota } = obterTurmaDoCenario(turma);
  const resposta = await requisitar('GET', rota, 200);
  assert.deepEqual((await resposta.json()).lembretes, []);
});

Given('o prazo acadêmico da turma {string} é {string}', async (turma: string, data: string) => {
  const { ano, semestre } = obterTurmaDoCenario(turma);
  const prazoAcademico = new Date(dataParaCampo(data)).toISOString();
  await requisitar('PUT', `/api/periodos-academicos/${ano}/${semestre}`, 200, { prazoAcademico });
});

When('{string} acessa a tela {string} da turma {string}',
  async (_professor: string, tela: string, turma: string) => {
    assert.equal(turma, turmaSelecionada);
    const { topic, ano, semestre } = obterTurmaDoCenario(turma);
    const semestreNaTela = semestre === '1' ? '1st Semester' : '2nd Semester';
    await clicar('Configurar lembretes', [topic, ano, semestreNaTela]);
    await conferirTexto('#reminder-settings-title', tela);
  });

When('inicia a edição dos lembretes', () => clicar('Editar lembretes'));

When('informa {string} como quantidade de lembretes', (quantidade: string) =>
  preencher('#reminder-count', quantidade)
);

When('adiciona {int} lembrete(s)', async (quantidade: number) => {
  for (let adicionado = 0; adicionado < quantidade; adicionado++) {
    await clicar('Adicionar lembrete');
  }
});

When('marca o lembrete de {string} para remoção', async (data: string) => {
  const alvo = await pagina.waitForFunction((seletor, valor) => {
    // Procura a linha pela data visível no formulário, mesmo se a posição mudar.
    const linha = Array.from(document.querySelectorAll(seletor)).find(item =>
      item.querySelector<HTMLInputElement>('input')?.value === valor
    );
    return Array.from(linha?.querySelectorAll('button') ?? []).find(botao =>
      !botao.disabled && botao.textContent?.trim() === 'Remover'
    );
  }, {}, `${telaLembretes} .reminder-edit-row`, dataParaCampo(data));

  const elemento = alvo.asElement();
  assert(elemento);
  const botao = await elemento.toElement('button');
  await botao.click();
});

// Os campos usam índices a partir de zero; a lista do resumo usa posições a partir de um.
const indicesDosLembretes = { primeiro: 0, segundo: 1, terceiro: 2 };
type OrdemLembrete = keyof typeof indicesDosLembretes;

When(/^define o (primeiro|segundo|terceiro) lembrete para "([^"]+)"$/,
  (ordem: OrdemLembrete, data: string) =>
    preencher(`#reminder-date-${indicesDosLembretes[ordem]}`, dataParaCampo(data))
);

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

Then(/^o (primeiro|segundo|terceiro) lembrete está programado para "([^"]+)"$/,
  (ordem: OrdemLembrete, data: string) => {
    const posicao = indicesDosLembretes[ordem] + 1;
    return conferirTexto(`${telaLembretes} ol li:nth-child(${posicao})`, data);
  }
);

Then('o prazo acadêmico apresentado é {string}', (prazo: string) =>
  conferirTexto(`${telaLembretes} > p:nth-of-type(2) > strong`, prazo)
);

Given('a turma {string} possui um lembrete não enviado para {string}',
  (turma: string, data: string) => prepararLembretes(turma, [data])
);

Given('a turma {string} possui dois lembretes não enviados para {string} e {string}',
  (turma: string, primeiraData: string, segundaData: string) =>
    prepararLembretes(turma, [primeiraData, segundaData])
);

Given(
  'a turma {string} possui um lembrete enviado em {string} e dois não enviados para {string} e {string}',
  async (nome: string, dataEnviada: string, primeiraPendente: string, segundaPendente: string) => {
    const turma = obterTurmaDoCenario(nome);

    // Reutiliza a instância isolada que o hook Before iniciou para este cenário.
    const { classes } = require('../../../server/src/server') as { classes: ClassesDaApiDeTeste };
    const turmaNoServidor = classes.findClassById(turma.id);
    assert(turmaNoServidor, `Turma não encontrada no servidor de teste: ${nome}`);

    const configuracao = turmaNoServidor.obterConfiguracaoLembretes();
    const registros = [
      { dataLocal: dataEnviada, estado: 'Enviado' },
      { dataLocal: primeiraPendente, estado: 'Não enviado' },
      { dataLocal: segundaPendente, estado: 'Não enviado' }
    ] as const;

    registros.forEach(({ dataLocal, estado }, indice) => {
      const instante = new Date(dataParaCampo(dataLocal)).toISOString();
      configuracao.add(new Lembrete({
        id: `lembrete-existente-${indice + 1}`,
        data: instante.slice(0, 10),
        horario: instante.slice(11, 16),
        estado
      }));
    });

    // Guarda a configuração inicial para comparar os registros após a redução.
    const resposta = await requisitar('GET', turma.rota, 200);
    turma.anterior = await resposta.json();
  }
);

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
  const { rota, anterior } = obterTurmaDoCenario(turmaSelecionada);
  assert(anterior);
  const resposta = await requisitar('GET', rota, 200);
  assert.deepEqual(await resposta.json(), anterior);
});

Then(
  'somente a data e o horário do primeiro lembrete da turma {string} mudam para {string}, preservando a configuração da turma {string}',
  async (nomeEditada: string, novaData: string, nomeOutra: string) => {
    const editada = obterTurmaDoCenario(nomeEditada);
    const outra = obterTurmaDoCenario(nomeOutra);
    assert(editada.anterior && outra.anterior);

    const instante = new Date(dataParaCampo(novaData)).toISOString();
    const [primeiro, ...demais] = editada.anterior.lembretes;

    // Compara toda a configuração de ESS, alterando na expectativa apenas a data e o horário.
    const respostaEditada = await requisitar('GET', editada.rota, 200);
    assert.deepEqual(await respostaEditada.json(), {
      ...editada.anterior,
      lembretes: [
        { ...primeiro, data: instante.slice(0, 10), horario: instante.slice(11, 16) },
        ...demais
      ]
    });

    const respostaOutra = await requisitar('GET', outra.rota, 200);
    assert.deepEqual(await respostaOutra.json(), outra.anterior);
  }
);

Then(
  'os lembretes anteriores de {string} permanecem iguais e o único novo está não enviado para {string}',
  async (nome: string, data: string) => {
    const { rota, anterior } = obterTurmaDoCenario(nome);
    assert(anterior);

    const resposta = await requisitar('GET', rota, 200);
    const atual: ConfiguracaoLembretes = await resposta.json();
    assert.equal(atual.lembretes.length, anterior.lembretes.length + 1);

    // Compara os registros anteriores inteiros, incluindo IDs, datas e estados.
    assert.deepEqual(atual.lembretes.slice(0, -1), anterior.lembretes);

    const novo = atual.lembretes[atual.lembretes.length - 1];
    const instante = new Date(dataParaCampo(data)).toISOString();
    assert(anterior.lembretes.every(lembrete => lembrete.id !== novo.id));
    assert.equal(novo.estado, 'Não enviado');
    assert.equal(novo.data, instante.slice(0, 10));
    assert.equal(novo.horario, instante.slice(11, 16));
  }
);

Then('somente o lembrete de {string} é removido da configuração gravada da turma {string}',
  async (data: string, nome: string) => {
    const { rota, anterior } = obterTurmaDoCenario(nome);
    assert(anterior);

    const instante = new Date(dataParaCampo(data)).toISOString();
    const removido = anterior.lembretes.find(lembrete =>
      lembrete.data === instante.slice(0, 10) && lembrete.horario === instante.slice(11, 16)
    );
    assert(removido);

    const resposta = await requisitar('GET', rota, 200);

    // Confere que saiu exatamente o ID escolhido e que os outros registros ficaram intactos.
    assert.deepEqual(await resposta.json(), {
      ...anterior,
      lembretes: anterior.lembretes.filter(lembrete => lembrete.id !== removido.id)
    });
  }
);
