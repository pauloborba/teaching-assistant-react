// Funções usadas pelos testes do relatório de desempenho do roteiro (serviço e GUI)
// para montar e limpar os dados no servidor.
import expect from 'expect';

export const serverUrl = 'http://localhost:3005';

// Aluno usado para cadastrar os resultados das turmas nos testes
const ALUNO_TESTE = { name: 'Aluno Teste Roteiro', cpf: '999.888.777-66', email: 'aluno.roteiro@teste.com' };

// Turmas criadas pelos testes, para apagar no final de cada cenário
let turmasCriadas: string[] = [];

// "ESS - 2026.2" -> topic "ESS", year 2026, semester 2, id "ESS-2026-2"
export function parseTurma(nome: string) {
  const [topic, periodo] = nome.split(' - ');
  const [year, semester] = periodo.split('.').map(Number);
  return { topic, year, semester, id: `${topic}-${year}-${semester}` };
}

// "8" -> 8, "1 dia" -> 1, "2 dias" -> 2
export function parseNumero(valor: string): number {
  return parseFloat(valor.replace(',', '.'));
}

function urlRespostas(nomeTurma: string, roteiro: string): string {
  const turmaId = encodeURIComponent(parseTurma(nomeTurma).id);
  return `${serverUrl}/api/classes/${turmaId}/roteiros/${encodeURIComponent(roteiro)}`;
}

async function garantirTurma(nomeTurma: string): Promise<void> {
  const { topic, year, semester, id } = parseTurma(nomeTurma);
  const turmas = await (await fetch(`${serverUrl}/api/classes`)).json();

  if (!turmas.some((t: any) => t.id === id)) {
    const response = await fetch(`${serverUrl}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, year, semester })
    });
    expect(response.status).toBe(201);
    turmasCriadas.push(id);
  }
}

async function garantirAlunoMatriculado(nomeTurma: string): Promise<void> {
  // Se o aluno ou a matrícula já existirem, o servidor recusa e seguimos normalmente
  await fetch(`${serverUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ALUNO_TESTE)
  });
  await fetch(`${serverUrl}/api/classes/${encodeURIComponent(parseTurma(nomeTurma).id)}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentCPF: ALUNO_TESTE.cpf })
  });
}

// Deixa a turma sem nenhum resultado no roteiro
export async function removerResultados(nomeTurma: string, roteiro: string): Promise<void> {
  await garantirTurma(nomeTurma);
  const response = await fetch(`${urlRespostas(nomeTurma, roteiro)}/respostas`, { method: 'DELETE' });
  expect(response.status).toBe(204);
}

// Deixa a turma com exatamente essas médias no roteiro (um aluno com esses valores)
export async function cadastrarResultado(nomeTurma: string, roteiro: string, acertos: string, erros: string, tempo: string): Promise<void> {
  await removerResultados(nomeTurma, roteiro);
  await garantirAlunoMatriculado(nomeTurma);

  const response = await fetch(`${urlRespostas(nomeTurma, roteiro)}/respostas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentCPF: ALUNO_TESTE.cpf,
      acertos: parseNumero(acertos),
      erros: parseNumero(erros),
      tempoEntrega: parseNumero(tempo)
    })
  });
  expect(response.status).toBe(201);
}

// Confere no servidor as médias da turma no roteiro
export async function verificarResultado(nomeTurma: string, roteiro: string, acertos: string, erros: string, tempo: string): Promise<void> {
  const response = await fetch(`${urlRespostas(nomeTurma, roteiro)}/desempenho`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    mediaAcertos: parseNumero(acertos),
    mediaErros: parseNumero(erros),
    mediaTempoEntrega: parseNumero(tempo)
  });
}

// Confere no servidor que a turma não tem resultados no roteiro
export async function verificarSemResultados(nomeTurma: string, roteiro: string): Promise<void> {
  const response = await fetch(`${urlRespostas(nomeTurma, roteiro)}/desempenho`);
  expect(response.status).toBe(404);
}

// Confere que nenhuma turma passada tem resultados no roteiro.
// turmasAtuais são as turmas que o cenário já configurou (a turma atual), que não contam como passadas.
export async function verificarNenhumaTurmaPassadaComResultados(roteiro: string, turmasAtuais: string[]): Promise<void> {
  const idsAtuais = turmasAtuais.map(nome => parseTurma(nome).id);
  const turmas = await (await fetch(`${serverUrl}/api/classes`)).json();

  const turmasComResultados = turmas.filter((t: any) =>
    !idsAtuais.includes(t.id) &&
    (t.respostasDeRoteiros || []).some((r: any) => r.roteiro === roteiro && r.avaliacoes.length > 0)
  );
  expect(turmasComResultados.map((t: any) => t.id)).toEqual([]);
}

// Apaga as turmas e o aluno criados pelos testes
export async function limparDadosDeTeste(): Promise<void> {
  for (const id of turmasCriadas) {
    await fetch(`${serverUrl}/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  turmasCriadas = [];
  await fetch(`${serverUrl}/api/students/${ALUNO_TESTE.cpf}`, { method: 'DELETE' });
}
