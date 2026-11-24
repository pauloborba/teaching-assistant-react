import express, { Request, Response } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation } from './models/Evaluation';
import { Classes } from './models/Classes';
import { HistoricoNotificacoes } from './models/HistoricoNotificacoes';
import { Class } from './models/Class';
import { Report } from './models/Report';
import { PeriodoAcademico } from './models/PeriodoAcademico';
import { ConfiguracaoLembretes } from './models/ConfiguracaoLembretes';
import { LembreteProposto } from './models/Lembrete';
import { Services } from './models/Services';
import { grupoRoutes } from './routes/grupos';
import * as fs from 'fs';
import * as path from 'path';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from './models/EspecificacaoDoCalculoDaMedia';

// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({dest: 'tmp_data/'})

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage with file persistence
const studentSet = new StudentSet();
const classes = new Classes();
const historicoLembretes = new HistoricoNotificacoes(); // Histórico das turmas, separado do fluxo de grupos.
const periodosAcademicos = new Map<string, PeriodoAcademico>(); // Mantém um período por identificação, como 2026.2, mesmo sem turmas cadastradas.
const dataFile = path.resolve('./data/app-data.json');

const obterOuCriarPeriodoAcademico = (ano: number, semestre: number): PeriodoAcademico => {
  const identificador = `${ano}.${semestre}`;
  const existente = periodosAcademicos.get(identificador);
  if (existente) return existente; // Reutiliza a mesma instância para todas as turmas do período.
  const novo = new PeriodoAcademico(ano, semestre); // Nenhum prazo é presumido para um período ainda não configurado.
  periodosAcademicos.set(identificador, novo);
  return novo;
};

// Persistence functions
const ensureDataDirectory = (): void => {
  const dataDir = path.dirname(dataFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const saveDataToFile = (
  periodosParaSalvar: ReadonlyMap<string, PeriodoAcademico> = periodosAcademicos,
  configuracoesParaSalvar: ReadonlyMap<string, ConfiguracaoLembretes> = new Map()
): boolean => { // Grava a proposta antes de alterar períodos ou lembretes em memória.
  try {
    const data = {
      historicoLembretes: historicoLembretes.toJSON(),
      emailDasTurmas: classes.obterEmailDasTurmas(), // Grava um único endereço no mesmo JSON das turmas e dos alunos.
      periodosAcademicos: Array.from(periodosParaSalvar.values()).map(periodo => ({
        ano: periodo.getAno(),
        semestre: periodo.getSemestre(),
        prazoAcademico: periodo.getPrazoAcademico()?.toISOString() ?? null // Grava o instante em ISO ou indica ausência de prazo.
      })),
      students: studentSet.getAllStudents().map(student => ({
        name: student.name,
        cpf: student.getCPF(),
        email: student.email,
        lastGradeNotificationDate: student.lastGradeNotificationDate
      })),
      classes: classes.getAllClasses().map(classObj => ({
        topic: classObj.getTopic(),
        semester: classObj.getSemester(),
        year: classObj.getYear(),
        especificacaoDoCalculoDaMedia: classObj.getEspecificacaoDoCalculoDaMedia().toJSON(),
        configuracaoLembretes: (
          configuracoesParaSalvar.get(classObj.getClassId()) ?? classObj.obterConfiguracaoLembretes()
        ).toJSON(), // Grava a proposta da turma ou sua configuração atual usando o método do modelo.
        enrollments: classObj.getEnrollments().map(enrollment => ({
          studentCPF: enrollment.getStudent().getCPF(),
          evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON())
        }))
      }))
    };
    
    ensureDataDirectory();
    const arquivoTemporario = `${dataFile}.tmp-${process.pid}`;
    fs.writeFileSync(arquivoTemporario, JSON.stringify(data, null, 2), 'utf8'); // Prepara o conteúdo completo sem substituir o arquivo atual.
    fs.renameSync(arquivoTemporario, dataFile); // Substitui o arquivo somente após concluir a escrita.
    return true;
  } catch (error) {
    console.error('Error saving application data:', error);
    return false; // Permite rejeitar a alteração quando a gravação falha.
  }
};

// Load data from file
const loadDataFromFile = (): void => {
  try {
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(fileContent);
      historicoLembretes.restaurar(data.historicoLembretes);
      if (data.emailDasTurmas != null) {
        classes.definirEmailDasTurmas(data.emailDasTurmas); // Recupera o contato quando ele existe no arquivo.
      }
      const configuracoesSalvas: ConfiguracaoLembretes[] = Array.isArray(data.classes)
        ? data.classes.map((turma: { configuracaoLembretes?: unknown }) =>
          ConfiguracaoLembretes.fromJSON(turma.configuracaoLembretes))
        : []; // Confere todos os lembretes antes de carregar as turmas; dados inválidos interrompem a inicialização.

      if (Array.isArray(data.periodosAcademicos)) { // Arquivos antigos continuam sendo lidos quando esse campo não existe.
        for (const registro of data.periodosAcademicos) {
          const periodo = new PeriodoAcademico(
            registro.ano,
            registro.semestre,
            registro.prazoAcademico == null ? null : new Date(registro.prazoAcademico) // Recupera também prazos históricos, sem tratá-los como novos cadastros.
          );

          periodosAcademicos.set(periodo.getIdentificador(), periodo); // Permite localizar o mesmo período pelo ano e semestre.
        }
      }

      const periodosLegados = new Map<string, PeriodoAcademico>(); // Recupera prazos antigos por turma somente quando não há um período oficial salvo.
      if (Array.isArray(data.classes)) {
        for (const classData of data.classes) {
          if (classData.prazoAcademico == null) continue;
          const identificador = `${Number(classData.year)}.${Number(classData.semester)}`;
          if (periodosAcademicos.has(identificador)) continue; // O período já cadastrado é a fonte oficial, inclusive quando está sem prazo.
          const legado = new PeriodoAcademico(Number(classData.year), Number(classData.semester), new Date(classData.prazoAcademico));
          const anterior = periodosLegados.get(identificador);
          if (anterior && anterior.getPrazoAcademico()?.getTime() !== legado.getPrazoAcademico()?.getTime()) {
            throw new Error(`Prazos acadêmicos antigos divergentes no período ${identificador}`); // Não escolhe silenciosamente um prazo entre turmas incompatíveis.
          }
          periodosLegados.set(identificador, legado);
        }
      }
      periodosLegados.forEach((periodo, identificador) => periodosAcademicos.set(identificador, periodo));
      
      // Load students
      if (data.students && Array.isArray(data.students)) {
        data.students.forEach((studentData: any) => {
          // Create student with basic info only - evaluations handled through enrollments
          const student = new Student(
            studentData.name,
            studentData.cpf,
            studentData.email
          );
          student.lastGradeNotificationDate = studentData.lastGradeNotificationDate ?? null;
          
          try {
            studentSet.addStudent(student);
          } catch (error) {
            console.error(`Error adding student ${studentData.name}:`, error);
          }
        });
      }

      // Load classes with enrollments
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach((classData: any, index: number) => {
          try {
            const periodo = obterOuCriarPeriodoAcademico(Number(classData.year), Number(classData.semester));
            const classObj = new Class(classData.topic, periodo, EspecificacaoDoCalculoDaMedia.fromJSON(classData.especificacaoDoCalculoDaMedia)); // Associa a turma ao período já recuperado, sem copiar seu prazo.

            configuracoesSalvas[index].listar().forEach(lembrete =>
              classObj.obterConfiguracaoLembretes().add(lembrete)); // Recupera identidades, estados e agendamentos históricos.

            classes.addClass(classObj);

            // Load enrollments for this class
            if (classData.enrollments && Array.isArray(classData.enrollments)) {
              classData.enrollments.forEach((enrollmentData: any) => {
                const student = studentSet.findStudentByCPF(enrollmentData.studentCPF);
                if (student) {
                  const enrollment = classObj.addEnrollment(student);
                  
                  // Load evaluations for this enrollment
                  if (enrollmentData.evaluations && Array.isArray(enrollmentData.evaluations)) {
                    enrollmentData.evaluations.forEach((evalData: any) => {
                      const evaluation = Evaluation.fromJSON(evalData);
                      enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
                    });
                  }
                    
                    // Load medias and attendance status if provided in the data file
                    if (typeof enrollmentData.mediaPreFinal !== 'undefined') {
                      enrollment.setMediaPreFinal(enrollmentData.mediaPreFinal);
                    }
                    if (typeof enrollmentData.mediaPosFinal !== 'undefined') {
                      enrollment.setMediaPosFinal(enrollmentData.mediaPosFinal);
                    }
                    if (typeof enrollmentData.reprovadoPorFalta !== 'undefined') {
                      enrollment.setReprovadoPorFalta(Boolean(enrollmentData.reprovadoPorFalta));
                    }
                } else {
                  console.error(`Student with CPF ${enrollmentData.studentCPF} not found for enrollment`);
                }
              });
            }
          } catch (error) {
            console.error(`Error adding class ${classData.topic}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading data from file:', error);
    throw error; // Interrompe a inicialização se a leitura falhar, evitando sobrescrever o arquivo com dados carregados parcialmente.
  }
};

// Test mode flag to disable file persistence
const isTestMode = process.env.NODE_ENV === 'test';

// Trigger save after any modification (async to not block operations)
const triggerSave = (): void => {
  if (!isTestMode) {
    setImmediate(() => {
      saveDataToFile();
    });
  }
};

// Load existing data on startup (only in non-test mode)
if (!isTestMode) {
  loadDataFromFile();
}

// Helper function to clean CPF
const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[.-]/g, '');
};

// Routes

app.get('/api/periodos-academicos/:ano/:semestre', (req: Request, res: Response) => {
  try {
    const identidade = new PeriodoAcademico(Number(req.params.ano), Number(req.params.semestre)); // Valida ano e semestre sem cadastrar um período.
    const periodo = periodosAcademicos.get(identidade.getIdentificador());

    if (!periodo) {
      return res.status(404).json({ error: 'Período acadêmico não cadastrado' });
    }

    res.json({
      ano: periodo.getAno(),
      semestre: periodo.getSemestre(),
      prazoAcademico: periodo.getPrazoAcademico()?.toISOString() ?? null
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.put('/api/periodos-academicos/:ano/:semestre', (req: Request, res: Response) => {
  try {
    const ano = Number(req.params.ano);
    const semestre = Number(req.params.semestre);
    const prazoInformado = req.body?.prazoAcademico;

    if (typeof prazoInformado !== 'string') {
      return res.status(400).json({ error: 'Prazo acadêmico inválido' });
    }

    const candidato = new PeriodoAcademico(ano, semestre); // Prepara a alteração sem modificar o período atual.
    const identificador = candidato.getIdentificador();
    const anterior = periodosAcademicos.get(identificador);
    const novoPrazo = new Date(prazoInformado);
    const instanteAtual = new Date(); // O servidor fornece um único instante para toda a operação.

    const configuracoes = classes.getAllClasses()
      .filter(turma => turma.getYear() === ano && turma.getSemester() === semestre)
      .map(turma => turma.obterConfiguracaoLembretes()); // Confere os lembretes de todas as turmas afetadas pelo prazo.

    candidato.definirPrazoAcademico(novoPrazo, instanteAtual, configuracoes); // Reutiliza as regras de datas e conflitos do domínio.

    const propostaDeGravacao = new Map(periodosAcademicos);
    propostaDeGravacao.set(identificador, candidato); // Prepara os dados que serão gravados, preservando o estado atual.

    if (!isTestMode && !saveDataToFile(propostaDeGravacao)) {
      return res.status(500).json({ error: 'Não foi possível salvar o prazo acadêmico' });
    }

    if (anterior) {
      anterior.definirPrazoAcademico(novoPrazo, instanteAtual, configuracoes); // Atualiza o objeto compartilhado após a gravação.
    } else {
      periodosAcademicos.set(identificador, candidato); // Disponibiliza o novo período após a gravação.
    }

    res.json({
      ano,
      semestre,
      prazoAcademico: candidato.getPrazoAcademico()?.toISOString() ?? null
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

const apresentarConfiguracaoLembretes = (turma: Class) => ({
  turmaId: turma.getClassId(),
  prazoAcademico: turma.getPrazoAcademico()?.toISOString() ?? null,
  lembretes: turma.obterConfiguracaoLembretes().toJSON()
});

app.get('/api/classes/:id/lembretes', (req: Request, res: Response) => {
  const turma = classes.findClassById(req.params.id);
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  res.json(apresentarConfiguracaoLembretes(turma)); // Consulta os lembretes e o prazo oficial da mesma turma.
});

app.put('/api/classes/:id/lembretes', (req: Request, res: Response) => {
  try {
    const turma = classes.findClassById(req.params.id);
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
    const prazo = turma.getPrazoAcademico();
    if (prazo === null) {
      return res.status(400).json({ error: 'Prazo acadêmico não definido para o período' });
    }

    const { quantidade, lembretes } = req.body ?? {};
    if (!Array.isArray(lembretes) || lembretes.some(item =>
      !item || typeof item.id !== 'string' || typeof item.data !== 'string' || typeof item.horario !== 'string'
    )) {
      return res.status(400).json({ error: 'Dados de lembretes inválidos' });
    }
    const propostas: LembreteProposto[] = lembretes.map(item => ({
      id: item.id, data: item.data, horario: item.horario
    })); // Descarta campos que tentariam alterar estado, motivo ou reenvio pela GUI.

    const atual = turma.obterConfiguracaoLembretes();
    const candidata = new ConfiguracaoLembretes(atual.listar());
    const instanteAtual = new Date(); // Usa o relógio do servidor para toda a operação.
    candidata.atualizar(quantidade, propostas, instanteAtual, prazo); // Valida a cópia sem alterar a configuração atual.

    if (quantidade > 0 && classes.obterEmailDasTurmas() === null) {
      return res.status(400).json({
        error: 'Cadastre um e-mail para as turmas na aba Classes'
      });
    }

    const configuracoesParaSalvar = new Map([[turma.getClassId(), candidata]]);
    if (!isTestMode && !saveDataToFile(periodosAcademicos, configuracoesParaSalvar)) {
      return res.status(500).json({ error: 'Não foi possível salvar os lembretes' });
    }

    atual.atualizar(quantidade, propostas, instanteAtual, prazo); // Publica a mesma proposta somente depois da gravação.
    res.json(apresentarConfiguracaoLembretes(turma));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/students - Get all students
app.get('/api/students', (req: Request, res: Response) => {
  try {
    const students = studentSet.getAllStudents();
    res.json(students.map(s => s.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/students - Add a new student
app.post('/api/students', (req: Request, res: Response) => {
  try {
    const { name, cpf, email } = req.body;
    
    if (!name || !cpf || email === undefined || email === null) {
      return res.status(400).json({ error: 'Name, CPF, and email are required' });
    }

    // Create student with basic information only - evaluations handled through enrollments
    const student = new Student(name, cpf, email);
    const addedStudent = studentSet.addStudent(student);
    triggerSave(); // Save to file after adding
    res.status(201).json(addedStudent.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/students/:cpf - Update a student
app.put('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const { name, email } = req.body;
    
    if (!name || email === undefined || email === null) {
      return res.status(400).json({ error: 'Name and email are required for update' });
    }
    
    // Create a Student object for update - evaluations handled through enrollments
    const updatedStudent = new Student(name, cpf, email);
    const result = studentSet.updateStudent(updatedStudent);
    triggerSave(); // Save to file after updating
    res.json(result.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/students/:cpf - Delete a student
app.delete('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const cleanedCPF = cleanCPF(cpf);
    const success = studentSet.removeStudent(cleanedCPF);
    
    if (!success) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    triggerSave(); // Save to file after deleting
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/students/:cpf/evaluation - Update a specific evaluation
// DEPRECATED: Evaluations are now handled through class enrollments
/*
app.put('/api/students/:cpf/evaluation', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const { goal, grade } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }
    
    const cleanedCPF = cleanCPF(cpf);
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    if (grade === '' || grade === null || grade === undefined) {
      // Remove evaluation
      student.removeEvaluation(goal);
    } else {
      // Add or update evaluation
      if (!['MANA', 'MPA', 'MA'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be MANA, MPA, or MA' });
      }
      student.addOrUpdateEvaluation(goal, grade);
    }
    
    triggerSave(); // Save to file after evaluation update
    res.json(student.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
*/

// GET /api/students/:cpf - Get a specific student
app.get('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const cleanedCPF = cleanCPF(cpf);
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/classes/email', (_req: Request, res: Response) => {
  res.json({ emailDasTurmas: classes.obterEmailDasTurmas() }); // Preenche o campo quando a aba abre.
});

app.put('/api/classes/email', (req: Request, res: Response) => {
  try {
    classes.definirEmailDasTurmas(req.body?.emailDasTurmas); // Valida antes de alterar o valor em memória.
    triggerSave(); // Agenda a gravação pelo mesmo fluxo do cadastro de turmas.
    res.json({ emailDasTurmas: classes.obterEmailDasTurmas() });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message }); // Informa o erro de validação na tela.
  }
});

// GET /api/classes - Get all classes
app.get('/api/classes', (req: Request, res: Response) => {
  try {
    const allClasses = classes.getAllClasses();
    res.json(allClasses.map(c => c.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// POST /api/classes - Add a new class
app.post('/api/classes', (req: Request, res: Response) => {
  try {
    const { topic, semester, year, prazoAcademico } = req.body; // O prazo é recebido apenas para rejeitar a antiga edição por turma.
    
    if (!topic || !semester || !year) {
      return res.status(400).json({ error: 'Topic, semester, and year are required' });
    }

    if (prazoAcademico !== undefined) {
      return res.status(400).json({ error: 'Defina o prazo acadêmico na configuração do período' });
    }

    if (classes.obterEmailDasTurmas() === null) {
      return res.status(400).json({
        error: 'Cadastre um e-mail para as turmas na aba Classes'
      });
    }

    const periodo = obterOuCriarPeriodoAcademico(Number(year), Number(semester));
    const classObj = new Class(topic, periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const newClass = classes.addClass(classObj); // Registra a turma somente após validar os dados fornecidos.
    triggerSave(); // Save to file after adding class
    res.status(201).json(newClass.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/classes/:id - Update a class
app.put('/api/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { topic, semester, year, prazoAcademico } = req.body; // A edição da turma não define um prazo independente do período.
    
    if (!topic || !semester || !year) {
      return res.status(400).json({ error: 'Topic, semester, and year are required' });
    }
    
    const existingClass = classes.findClassById(id);
    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (prazoAcademico !== undefined) {
      return res.status(400).json({ error: 'Defina o prazo acadêmico na configuração do período' });
    }

    const candidato = new PeriodoAcademico(Number(year), Number(semester)); // Valida a identidade de destino sem registrar uma alteração ainda não aceita.
    const periodo = periodosAcademicos.get(candidato.getIdentificador()) ?? candidato;
    existingClass.definirPeriodoAcademico(periodo); // Altera ano e semestre juntos, após conferir a compatibilidade dos lembretes existentes.
    existingClass.setTopic(topic);
    periodosAcademicos.set(periodo.getIdentificador(), periodo); // Registra um período novo somente após aceitar a troca.
    
    triggerSave(); // Save to file after updating class
    res.json(existingClass.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/classes/:id - Delete a class
app.delete('/api/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = classes.removeClass(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    triggerSave(); // Save to file after deleting class
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/classes/:classId/enroll - Enroll a student in a class
app.post('/api/classes/:classId/enroll', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { studentCPF } = req.body;
    
    if (!studentCPF) {
      return res.status(400).json({ error: 'Student CPF is required' });
    }

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const student = studentSet.findStudentByCPF(cleanCPF(studentCPF));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const enrollment = classObj.addEnrollment(student);
    triggerSave(); // Save to file after enrolling student
    res.status(201).json(enrollment.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/classes/:classId/enroll/:studentCPF - Remove student enrollment from a class
app.delete('/api/classes/:classId/enroll/:studentCPF', (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const success = classObj.removeEnrollment(cleanedCPF);
    
    if (!success) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }
    
    triggerSave(); // Save to file after unenrolling student
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/classes/:classId/enrollments - Get all enrollments for a class
app.get('/api/classes/:classId/enrollments', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const enrollments = classObj.getEnrollments();
    res.json(enrollments.map(e => e.toJSON()));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/classes/:classId/enrollments/:studentCPF/evaluation - Get the student's average and final average for a class
app.get('/api/classes/:classId/enrollments/:studentCPF/evaluation', (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }

    const mediaPreFinal = enrollment.getMediaPreFinal();
    const mediaPosFinal = enrollment.getMediaPosFinal();

    res.json({
      student: enrollment.getStudent().toJSON(),
      average: mediaPreFinal,
      final_average: mediaPosFinal
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/classes/:classId/enrollments/:studentCPF/evaluation - Update evaluation for an enrolled student
app.put('/api/classes/:classId/enrollments/:studentCPF/evaluation', async (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;
    const { goal, grade } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }

    if (grade === '' || grade === null || grade === undefined) {
      // Remove evaluation
      enrollment.removeEvaluation(goal);
    } else {
      // Add or update evaluation
      if (!['MANA', 'MPA', 'MA'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be MANA, MPA, or MA' });
      }
      enrollment.addOrUpdateEvaluation(goal, grade);
    }

    const emailResult = await services.gradeNotificationService.notify(
      enrollment.getStudent(),
      goal,
      grade,
      classObj.getTopic()
    );

    triggerSave(); // Save to file after evaluation update
    res.json(emailResult.emailAlert ? { ...enrollment.toJSON(), emailAlert: emailResult.emailAlert } : enrollment.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST api/classes/gradeImport/:classId, usado na feature de importacao de grades
// Vai ser usado em 2 fluxos(poderia ter divido em 2 endpoints mas preferi deixar em apenas 1)
// [Front] Upload → [Back] lê só o cabeçalho e retorna colunas da planilha e os goals da 'classId'
// [Front] Mapeia colunas da planilha para os goals → [Back] faz parse completo (stream)
app.post('/api/classes/gradeImport/:classId', upload_dir.single('file'), async (req: express.Request, res: express.Response) => {
  res.status(501).json({ error: "Endpoint ainda não implementado." });
});

// GET /api/classes/:classId/report - Generate statistics report for a class
app.get('/api/classes/:classId/report', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const report = new Report(classObj);
    res.json(report.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


// Groups, monitors and the notifications sent when a group changes
const services = new Services();
app.use('/api', grupoRoutes(services));

// Export the app for testing
export { app, studentSet, classes, periodosAcademicos, services, historicoLembretes, saveDataToFile };

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
