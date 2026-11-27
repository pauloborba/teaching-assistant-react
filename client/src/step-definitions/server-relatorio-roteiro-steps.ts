import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';
import {
  serverUrl, parseNumero, cadastrarResultado, removerResultados,
  verificarResultado, verificarSemResultados, verificarNenhumaTurmaPassadaComResultados, limparDadosDeTeste
} from './relatorio-roteiro-helpers';

setDefaultTimeout(60 * 1000);

// Estado do cenário
let relatorioPedido: boolean;    // o "When" já aconteceu?
let turmasConfiguradas: string[];
let respostaStatus: number;
let respostaBody: any;

Before({ tags: '@relatorio-servico' }, async function () {
  relatorioPedido = false;
  turmasConfiguradas = [];
});

After({ tags: '@relatorio-servico' }, async function () {
  await limparDadosDeTeste();
});

async function pedirRelatorio(roteiro: string, turmaAtual: string, passadas: string[]): Promise<void> {
  const params = new URLSearchParams();
  params.append('turmaAtual', turmaAtual);
  params.append('roteiro', roteiro);
  passadas.forEach(nome => params.append('passadas', nome));

  const response = await fetch(`${serverUrl}/api/relatorio-roteiro?${params.toString()}`);
  respostaStatus = response.status;
  respostaBody = await response.json();
  relatorioPedido = true;
}

// ---------- Given (e os "And" finais, que conferem que o estado não mudou) ----------

// Antes do pedido do relatório, o passo cria esse estado; depois do pedido, confere que ele continua igual
Given('o sistema tem a turma {string} com, no {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}',
  async function (turma: string, roteiro: string, acertos: string, erros: string, tempo: string) {
    if (relatorioPedido) {
      await verificarResultado(turma, roteiro, acertos, erros, tempo);
    } else {
      await cadastrarResultado(turma, roteiro, acertos, erros, tempo);
      turmasConfiguradas.push(turma);
    }
  });

Given('o sistema tem a turma {string} sem resultados no {string}', async function (turma: string, roteiro: string) {
  if (relatorioPedido) {
    await verificarSemResultados(turma, roteiro);
  } else {
    await removerResultados(turma, roteiro);
    turmasConfiguradas.push(turma);
  }
});

Given('o sistema não tem turma passada com resultados no {string}', async function (roteiro: string) {
  await verificarNenhumaTurmaPassadaComResultados(roteiro, turmasConfiguradas);
});

// ---------- When ----------

When('eu peço ao sistema o relatório do {string} da turma {string} em comparação com as turmas {string} e {string}',
  async function (roteiro: string, turmaAtual: string, passada1: string, passada2: string) {
    await pedirRelatorio(roteiro, turmaAtual, [passada1, passada2]);
  });

When('eu peço ao sistema o relatório do {string} da turma {string} em comparação com a turma {string}',
  async function (roteiro: string, turmaAtual: string, passada: string) {
    await pedirRelatorio(roteiro, turmaAtual, [passada]);
  });

When('eu peço ao sistema o relatório do {string} da turma {string}', async function (roteiro: string, turmaAtual: string) {
  await pedirRelatorio(roteiro, turmaAtual, []);
});

// ---------- Then ----------

Then('o sistema retorna, para {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}',
  async function (turma: string, acertos: string, erros: string, tempo: string) {
    expect(respostaStatus).toBe(200);
    const linha = respostaBody.find((l: any) => l.turma === turma);
    expect(linha).toEqual({
      turma,
      mediaAcertos: parseNumero(acertos),
      mediaErros: parseNumero(erros),
      mediaTempoEntrega: parseNumero(tempo)
    });
  });

Then('o sistema não retorna {string}', async function (turma: string) {
  expect(respostaStatus).toBe(200);
  expect(respostaBody.map((l: any) => l.turma)).not.toContain(turma);
});

Then('o sistema retorna a mensagem de erro {string}', async function (mensagem: string) {
  expect(respostaStatus).toBe(400);
  expect(respostaBody.error).toBe(mensagem);
});
