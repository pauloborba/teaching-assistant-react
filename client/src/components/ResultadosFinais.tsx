import React, { useCallback, useEffect, useState } from 'react';
import { Class } from '../types/Class';
import ClassService from '../services/ClassService';
import {
  ErroDaApi, formatarMedia, LinhaResultado, PedidoDeEnvio, RelatorioEnvio, ResultadosDaTurma, resultadoService
} from '../services/ResultadoService';
import './ResultadosFinais.css';

interface Mensagem {
  tipo: 'sucesso' | 'erro' | 'alerta';
  texto: string;
  /** Explicação em linguagem usual (erros). */
  explicacao?: string;
  /** Alunos que não receberam por terem notas pendentes. */
  avisos?: string[];
  /** Detalhes das falhas, apresentados em uma seção recolhida. */
  detalhes?: string[];
  podeTentarNovamente?: boolean;
}

interface Previa {
  cpf: string;
  nome: string;
  assunto: string;
  conteudo: string;
}

const RESULTADOS_EM_PROVA_FINAL = ['Final', 'Aprovado na final', 'Reprovado na final'];

const listarMetas = (metas: string[]): string => {
  const nomes = metas.map(m => `"${m}"`);
  if (nomes.length === 1) return `na meta ${nomes[0]}`;
  return `nas metas ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
};

/** Transforma o relatório do servidor na mensagem apresentada ao professor. */
const mensagemDoRelatorio = (relatorio: RelatorioEnvio, individual: boolean): Mensagem => {
  const avisos = relatorio.semResultado.map(a =>
    `${a.aluno} não recebeu o resultado por ter nota pendente ${listarMetas(a.metasPendentes)}.`);

  if (relatorio.falhas.length > 0) {
    return {
      tipo: 'erro',
      texto: 'Erro ao enviar as mensagens',
      explicacao: relatorio.falhas.length === 1
        ? 'Um aluno não recebeu o resultado. Você pode tentar o envio novamente.'
        : `${relatorio.falhas.length} alunos não receberam o resultado. Você pode tentar o envio novamente.`,
      detalhes: relatorio.falhas.map(f => `${f.aluno} não recebeu o resultado porque ${f.motivo}.`),
      avisos,
      podeTentarNovamente: true
    };
  }
  if (relatorio.enviados.length === 0) {
    if (avisos.length > 0) {
      return { tipo: 'alerta', texto: 'Nenhum e-mail foi enviado: os alunos escolhidos têm notas pendentes', avisos };
    }
    if (relatorio.jaEnviados.length > 0) {
      return { tipo: 'alerta', texto: 'Os resultados já tinham sido enviados; nenhum e-mail foi enviado novamente' };
    }
    return { tipo: 'alerta', texto: 'Nenhum aluno para enviar' };
  }
  if (avisos.length > 0) {
    return { tipo: 'sucesso', texto: 'E-mails enviados com sucesso para os alunos com resultado definido', avisos };
  }
  return {
    tipo: 'sucesso',
    texto: individual && relatorio.enviados.length === 1 ? 'E-mail enviado com sucesso' : 'E-mails enviados com sucesso'
  };
};

const ResultadosFinais: React.FC = () => {
  const [turmas, setTurmas] = useState<Class[]>([]);
  const [turmaId, setTurmaId] = useState<string>(() => localStorage.getItem('resultados-selected-class') || '');
  const [dados, setDados] = useState<ResultadosDaTurma | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [notasFinais, setNotasFinais] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    ClassService.getAllClasses()
      .then(setTurmas)
      .catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar as turmas' }));
  }, []);

  const carregar = useCallback(async (id: string) => {
    if (!id) {
      setDados(null);
      return;
    }
    try {
      setDados(await resultadoService.listar(id));
    } catch (e) {
      setDados(null);
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    setSelecionados(new Set());
    setPrevia(null);
    setNotasFinais({});
    carregar(turmaId);
  }, [turmaId, carregar]);

  const escolherTurma = (id: string) => {
    setMensagem(null);
    setTurmaId(id);
    if (id) localStorage.setItem('resultados-selected-class', id);
    else localStorage.removeItem('resultados-selected-class');
  };

  /** Libera o envio e mostra o que aconteceu. */
  const liberar = async (pedido: PedidoDeEnvio, individual = false) => {
    if (!dados) return;
    setEnviando(true);
    setMensagem(null);
    try {
      const resposta = await resultadoService.liberarEnvio(dados.turma.id, pedido);
      setDados({ turma: resposta.turma, alunos: resposta.alunos });
      setMensagem(mensagemDoRelatorio(resposta.relatorio, individual));
      setSelecionados(new Set());
      setPrevia(null);
    } catch (e) {
      const erro = e as ErroDaApi;
      setMensagem({ tipo: erro.status === 409 ? 'alerta' : 'erro', texto: erro.message });
      await carregar(dados.turma.id);
    } finally {
      setEnviando(false);
    }
  };

  const abrirPrevia = async (aluno: LinhaResultado) => {
    if (!dados) return;
    setMensagem(null);
    try {
      const { assunto, conteudo } = await resultadoService.previsualizar(dados.turma.id, aluno.cpf);
      setPrevia({ cpf: aluno.cpf, nome: aluno.nome, assunto, conteudo });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    }
  };

  const salvarNotaFinal = async (aluno: LinhaResultado) => {
    if (!dados) return;
    const texto = (notasFinais[aluno.cpf] ?? '').trim().replace(',', '.');
    const nota = texto === '' ? null : Number(texto);
    if (nota !== null && Number.isNaN(nota)) {
      setMensagem({ tipo: 'erro', texto: 'Informe a nota da prova final com números, por exemplo 4,5' });
      return;
    }
    setMensagem(null);
    try {
      const { atualizacaoResultado } = await resultadoService.registrarNotaProvaFinal(dados.turma.id, aluno.cpf, nota);
      setNotasFinais(atual => {
        const { [aluno.cpf]: _removida, ...resto } = atual;
        return resto;
      });
      await carregar(dados.turma.id);
      if (atualizacaoResultado?.enviado) {
        setMensagem({ tipo: 'sucesso', texto: `Resultado atualizado e e-mail de atualização enviado para ${atualizacaoResultado.aluno}` });
      } else if (atualizacaoResultado) {
        setMensagem({
          tipo: 'erro',
          texto: 'Erro ao enviar as mensagens',
          explicacao: `O resultado de ${atualizacaoResultado.aluno} mudou para "${atualizacaoResultado.resultadoNovo}", mas o e-mail de atualização não foi enviado.`,
          detalhes: [`${atualizacaoResultado.aluno} não recebeu a atualização porque ${atualizacaoResultado.motivoFalha}.`],
          podeTentarNovamente: true
        });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Nota da prova final salva' });
      }
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    }
  };

  const alternarSelecao = (cpf: string) => {
    setSelecionados(atual => {
      const novo = new Set(atual);
      if (novo.has(cpf)) novo.delete(cpf);
      else novo.add(cpf);
      return novo;
    });
  };

  const pendentes = dados?.alunos.filter(a => a.statusEnvio === 'Pendente').length ?? 0;
  const prazo = dados?.turma.prazoAcademico ? new Date(dados.turma.prazoAcademico) : null;

  return (
    <div className="resultados" data-cy="resultados-finais-pagina">
      <div className="rf-titulo">
        <h2>Resultados Finais</h2>
        <p>Libere o envio por e-mail do resultado final de cada aluno, para toda a turma ou para os alunos escolhidos.</p>
      </div>

      <div className="rf-turma">
        <label htmlFor="rf-turma-select">Turma:</label>
        <select id="rf-turma-select" data-cy="turma-select" value={turmaId} onChange={e => escolherTurma(e.target.value)}>
          <option value="">-- Selecione uma turma --</option>
          {turmas.map(t => (
            <option key={t.id} value={t.id}>{t.topic} ({t.year}.{t.semester})</option>
          ))}
        </select>
      </div>

      {mensagem && (
        <div className={`rf-mensagem rf-mensagem--${mensagem.tipo}`} role="alert" data-cy={`mensagem-${mensagem.tipo}`}>
          <strong data-cy="mensagem-texto">{mensagem.texto}</strong>
          {mensagem.explicacao && <p>{mensagem.explicacao}</p>}
          {mensagem.avisos && mensagem.avisos.length > 0 && (
            <ul className="rf-avisos" data-cy="avisos-pendencias">
              {mensagem.avisos.map(aviso => <li key={aviso}>{aviso}</li>)}
            </ul>
          )}
          {mensagem.detalhes && mensagem.detalhes.length > 0 && (
            <details className="rf-detalhes" data-cy="detalhes-falhas">
              <summary>Detalhes</summary>
              <ul>{mensagem.detalhes.map(d => <li key={d}>{d}</li>)}</ul>
            </details>
          )}
          {mensagem.podeTentarNovamente && (
            <button
              className="rf-btn rf-btn--secundario"
              data-cy="tentar-novamente-btn"
              disabled={enviando}
              onClick={() => liberar({ somentePendentes: true })}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!dados && !turmaId && <p className="rf-vazio">Selecione uma turma para ver os resultados.</p>}

      {dados && (
        <>
          <dl className="rf-info">
            <div><dt>Disciplina</dt><dd>{dados.turma.disciplina}</dd></div>
            <div><dt>Período</dt><dd>{dados.turma.periodo}</dd></div>
            <div><dt>Corretor</dt><dd data-cy="corretor">{dados.turma.professor}</dd></div>
            <div>
              <dt>Fim do período de correção</dt>
              <dd>{prazo ? prazo.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não definido'}</dd>
            </div>
          </dl>
          {prazo && (
            <p className="rf-nota">Depois do fim do período de correção, os resultados definidos que ainda não foram enviados são enviados automaticamente.</p>
          )}

          <div className="rf-acoes">
            <button
              className="rf-btn rf-btn--primario"
              data-cy="liberar-turma-btn"
              disabled={enviando || dados.alunos.length === 0}
              onClick={() => liberar({})}
            >
              Liberar envio para toda a turma
            </button>
            <button
              className="rf-btn rf-btn--secundario"
              data-cy="liberar-selecionados-btn"
              disabled={enviando || selecionados.size === 0}
              onClick={() => liberar({ alunos: Array.from(selecionados) })}
            >
              Liberar envio para os selecionados ({selecionados.size})
            </button>
            {pendentes > 0 && (
              <button
                className="rf-btn rf-btn--secundario"
                data-cy="reenviar-pendentes-btn"
                disabled={enviando}
                onClick={() => liberar({ somentePendentes: true })}
              >
                Tentar novamente para os pendentes ({pendentes})
              </button>
            )}
          </div>

          {dados.alunos.length === 0 ? (
            <p className="rf-vazio">Nenhum aluno matriculado nesta turma.</p>
          ) : (
            <table className="rf-tabela" data-cy="resultados-tabela">
              <thead>
                <tr>
                  <th aria-label="Selecionar" />
                  <th>Aluno</th>
                  <th>Média</th>
                  <th>Prova final</th>
                  <th>Média final</th>
                  <th>Resultado</th>
                  <th>Status de envio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.alunos.map(aluno => {
                  const emFinal = aluno.resultado !== null && RESULTADOS_EM_PROVA_FINAL.includes(aluno.resultado);
                  return (
                    <tr key={aluno.cpf} data-cy="resultado-aluno" data-nome={aluno.nome} data-status={aluno.statusEnvio}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${aluno.nome}`}
                          data-cy="selecionar-aluno"
                          checked={selecionados.has(aluno.cpf)}
                          disabled={aluno.resultado === null}
                          onChange={() => alternarSelecao(aluno.cpf)}
                        />
                      </td>
                      <td data-cy="aluno-nome">
                        {aluno.nome}
                        {!aluno.possuiEmail && <span className="rf-sub">sem e-mail cadastrado</span>}
                      </td>
                      <td data-cy="aluno-media">{formatarMedia(aluno.media)}</td>
                      <td>
                        {emFinal ? (
                          <span className="rf-linha">
                            <input
                              className="rf-nota-final"
                              aria-label={`Nota da prova final de ${aluno.nome}`}
                              data-cy="nota-final-input"
                              inputMode="decimal"
                              placeholder="0 a 10"
                              value={notasFinais[aluno.cpf] ?? (aluno.notaProvaFinal === null ? '' : formatarMedia(aluno.notaProvaFinal))}
                              onChange={e => setNotasFinais({ ...notasFinais, [aluno.cpf]: e.target.value })}
                            />
                            <button className="rf-btn rf-btn--pequeno" data-cy="salvar-nota-final-btn" onClick={() => salvarNotaFinal(aluno)}>
                              Salvar
                            </button>
                          </span>
                        ) : '—'}
                      </td>
                      <td>{formatarMedia(aluno.mediaFinal)}</td>
                      <td data-cy="aluno-resultado">
                        {aluno.resultado ?? (
                          <span className="rf-pendente">Notas pendentes: {aluno.metasPendentes.join(', ')}</span>
                        )}
                      </td>
                      <td>
                        <span className={`rf-status rf-status--${aluno.statusEnvio === 'Não enviado' ? 'nao-enviado' : aluno.statusEnvio.toLowerCase()}`} data-cy="aluno-status">
                          {aluno.statusEnvio}
                        </span>
                        {aluno.statusEnvio === 'Pendente' && aluno.motivoFalha && (
                          <span className="rf-sub">Falha: {aluno.motivoFalha}</span>
                        )}
                      </td>
                      <td className="rf-linha">
                        <button
                          className="rf-btn rf-btn--pequeno"
                          data-cy="previa-btn"
                          disabled={aluno.resultado === null || enviando}
                          onClick={() => abrirPrevia(aluno)}
                        >
                          Pré-visualizar
                        </button>
                        <button
                          className="rf-btn rf-btn--pequeno rf-btn--primario"
                          data-cy="enviar-individual-btn"
                          disabled={aluno.resultado === null || enviando}
                          onClick={() => liberar({ alunos: [aluno.cpf] }, true)}
                        >
                          Enviar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {previa && (
            <section className="rf-previa" data-cy="previa-email" aria-label={`Pré-visualização do e-mail de ${previa.nome}`}>
              <h3>E-mail de {previa.nome}</h3>
              <p className="rf-sub">Assunto: {previa.assunto}</p>
              <label htmlFor="rf-previa-texto">Texto do e-mail (pode ser editado antes da liberação)</label>
              <textarea
                id="rf-previa-texto"
                data-cy="previa-texto"
                rows={9}
                value={previa.conteudo}
                onChange={e => setPrevia({ ...previa, conteudo: e.target.value })}
              />
              <div className="rf-acoes">
                <button
                  className="rf-btn rf-btn--primario"
                  data-cy="liberar-previa-btn"
                  disabled={enviando || !previa.conteudo.trim()}
                  onClick={() => liberar({ alunos: [previa.cpf], conteudos: { [previa.cpf]: previa.conteudo } }, true)}
                >
                  Liberar envio do e-mail
                </button>
                <button className="rf-btn rf-btn--secundario" data-cy="cancelar-previa-btn" onClick={() => setPrevia(null)}>
                  Cancelar
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ResultadosFinais;
