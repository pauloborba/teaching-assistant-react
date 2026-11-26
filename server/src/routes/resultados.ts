import { NextFunction, Request, Response, Router } from 'express';
import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { DomainError } from '../models/DomainError';
import { Enrollment } from '../models/Enrollment';
import { MENSAGEM_RESULTADO_JA_ENVIADO, ResultadosService } from '../models/ResultadosService';

/** Linha da página "Resultados Finais": dados do próprio aluno, sem CPF de terceiros nem e-mail. */
export const linhaDeResultado = (matricula: Enrollment) => {
  const aluno = matricula.getStudent();
  const envio = matricula.getEnvioResultado();
  return {
    cpf: aluno.toJSON().cpf,
    nome: aluno.name,
    possuiEmail: Boolean(aluno.email),
    media: matricula.getMediaPreFinal(),
    notaProvaFinal: matricula.getNotaProvaFinal(),
    mediaFinal: matricula.getMediaPosFinal(),
    resultado: matricula.getResultadoFinal(),
    metasPendentes: matricula.getMetasPendentes(),
    statusEnvio: envio.status,
    resultadoEnviado: envio.resultadoEnviado,
    motivoFalha: envio.motivoFalha
  };
};

const apresentarResultados = (turma: Class) => ({
  turma: {
    id: turma.getClassId(),
    disciplina: turma.getTopic(),
    periodo: `${turma.getYear()}.${turma.getSemester()}`,
    professor: turma.getProfessor(),
    prazoAcademico: turma.getPrazoAcademico()?.toISOString() ?? null
  },
  alunos: turma.getEnrollments().map(linhaDeResultado)
});

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;

/** Regra violada: 400; qualquer outro erro: 500. */
const tratar = (handler: Handler) => async (req: Request, res: Response, _next: NextFunction) => {
  try {
    await handler(req, res);
  } catch (error) {
    if (error instanceof DomainError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Erro nos resultados finais:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

/**
 * Rotas do envio dos resultados finais por e-mail. Montadas em /api.
 * `salvar` grava os dados depois de qualquer alteração de estado.
 */
export function resultadosRoutes(classes: Classes, servico: ResultadosService, salvar: () => void): Router {
  const router = Router();

  const buscarTurma = (id: string): Class => {
    const turma = classes.findClassById(id);
    if (!turma) throw new DomainError('Turma não encontrada');
    return turma;
  };

  // Situação de cada aluno: média, resultado, pendências e status do envio
  router.get('/classes/:id/resultados', tratar((req, res) => {
    res.json(apresentarResultados(buscarTurma(req.params.id)));
  }));

  // Pré-visualização do e-mail, que o professor pode editar antes de liberar o envio
  router.get('/classes/:id/resultados/:cpf/previa', tratar((req, res) => {
    res.json(servico.previsualizar(buscarTurma(req.params.id), req.params.cpf));
  }));

  // Liberação do envio: toda a turma, alunos escolhidos ou nova tentativa para os pendentes
  router.post('/classes/:id/resultados/envio', tratar(async (req, res) => {
    const turma = buscarTurma(req.params.id);
    const { alunos, conteudos, somentePendentes } = req.body ?? {};
    if (alunos !== undefined && (!Array.isArray(alunos) || alunos.some((cpf: unknown) => typeof cpf !== 'string'))) {
      throw new DomainError('Lista de alunos inválida');
    }
    if (Array.isArray(alunos) && alunos.length === 0) {
      throw new DomainError('Selecione ao menos um aluno');
    }

    const relatorio = await servico.liberarEnvio(turma, {
      cpfs: alunos,
      conteudos: conteudos && typeof conteudos === 'object' ? conteudos : undefined,
      somentePendentes: somentePendentes === true
    });
    salvar();

    const nadaMaisAEnviar = relatorio.enviados.length === 0 && relatorio.falhas.length === 0
      && relatorio.semResultado.length === 0 && relatorio.jaEnviados.length > 0;
    if (Array.isArray(alunos) && nadaMaisAEnviar) {
      // Envio individual de um resultado que já foi enviado: nada é enviado de novo.
      return res.status(409).json({
        error: relatorio.jaEnviados.length === 1
          ? MENSAGEM_RESULTADO_JA_ENVIADO
          : 'Os e-mails com o resultado final destes alunos já foram enviados',
        relatorio,
        ...apresentarResultados(turma)
      });
    }
    res.json({ relatorio, ...apresentarResultados(turma) });
  }));

  // Cadastro da nota da prova final; se o resultado já enviado mudar, vai um e-mail de atualização
  router.put('/classes/:id/enrollments/:cpf/prova-final', tratar(async (req, res) => {
    const turma = buscarTurma(req.params.id);
    const matricula = turma.findEnrollmentByStudentCPF(req.params.cpf.replace(/\D/g, ''));
    if (!matricula) throw new DomainError('Aluno não matriculado na turma');

    const { nota } = req.body ?? {};
    if (nota !== null && typeof nota !== 'number') {
      throw new DomainError('A nota da prova final deve estar entre 0 e 10');
    }
    matricula.registrarNotaProvaFinal(nota);
    const atualizacaoResultado = await servico.notificarMudancaDeResultado(turma, matricula);
    salvar();
    res.json({ aluno: linhaDeResultado(matricula), atualizacaoResultado });
  }));

  return router;
}
