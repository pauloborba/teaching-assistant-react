import { Class } from "../types/Class";
import { Enrollment } from "../types/Enrollment";

// ===========================
// TIPOS E INTERFACES
// ===========================

interface CategoryStatistics {
  approvedByAverage: number;    // APV. M - Aprovado pela média (>= 7.0)
  failedByAverage: number;      // REP. M - Reprovado pela média (< 3.0)
  approvedByGrade: number;      // APV. N - Aprovado pela nota final (>= 5.0)
  failedByGrade: number;        // REP. N - Reprovado pela nota final (< 5.0)
  failedByAttendance: number;   // REP. F - Reprovado por falta
  totalStudents: number;
}

interface AnalyticsData {
  discipline: string;
  periodLabel: string;
  year: number;
  semester: number;
  statistics: CategoryStatistics;
}

export interface ChartDataPoint {
  period: string;
  'APV. M': number;
  'APV. N': number;
  'REP. N': number;
  'REP. M': number;
  'REP. F': number;
}

type StudentCategory = keyof Omit<CategoryStatistics, 'totalStudents'>;

// Extensão do tipo Enrollment para incluir as propriedades de média
interface EnrollmentWithGrades extends Enrollment {
  mediaPreFinal?: number;
  mediaPosFinal?: number;
  reprovadoPorFalta?: boolean;
}

// ===========================
// FUNÇÕES DE CLASSIFICAÇÃO
// ===========================

/**
 * Classifica um aluno com base nas médias já calculadas
 * Retorna a categoria do aluno ou null se não houver dados válidos
 */
function classifyStudent(enrollment: Enrollment): StudentCategory | null {
  // Acessar diretamente as propriedades do objeto (vem como JSON plain object)
  const enrollmentData = enrollment as any;
  
  const reprovadoPorFalta = enrollmentData.reprovadoPorFalta ?? false;
  const mediaPosFinal = enrollmentData.mediaPosFinal ?? 0;
  const mediaPreFinal = enrollmentData.mediaPreFinal ?? 0;

  console.log('🔍 Classificando aluno:', {
    student: enrollmentData.student?.name || enrollmentData.student?.cpf,
    mediaPreFinal,
    mediaPosFinal,
    reprovadoPorFalta,
    enrollmentKeys: Object.keys(enrollmentData)
  });

  // 1. Verificar reprovação por falta (prioridade máxima)
  if (reprovadoPorFalta) {
    console.log('   → REP. F (Falta)');
    return 'failedByAttendance';
  }

  // 2. Aprovado pela média (não precisou da prova final)
  if (mediaPreFinal >= 7.0) {
    console.log('   → APV. M (Média ≥ 7.0)');
    return 'approvedByAverage';
  }

  // 3. Aluno fez prova final (média pré-final entre 3.0 e 7.0)
  if (mediaPreFinal >= 3.0 && mediaPreFinal < 7.0) {
    // Aprovado pela nota final
    if (mediaPosFinal >= 5.0) {
      console.log('   → APV. N (Final ≥ 5.0)');
      return 'approvedByGrade';
    }
    // Reprovado pela nota final
    console.log('   → REP. N (Final < 5.0)');
    return 'failedByGrade';
  }

  // 4. Reprovado pela média baixa (média pré-final < 3.0)
  console.log('   → REP. M (Média < 3.0)');
  return 'failedByAverage';
}

/**
 * Calcula as estatísticas de desempenho para uma turma
 */
function calculateClassStatistics(classObj: Class): CategoryStatistics {
  const enrollments = classObj.enrollments || [];
  
  console.log('📊 Calculando estatísticas para turma:', {
    topic: classObj.topic,
    year: classObj.year,
    semester: classObj.semester,
    totalEnrollments: enrollments.length
  });

  const stats: CategoryStatistics = {
    approvedByAverage: 0,
    failedByAverage: 0,
    approvedByGrade: 0,
    failedByGrade: 0,
    failedByAttendance: 0,
    totalStudents: enrollments.length
  };

  enrollments.forEach((enrollment) => {
    const category = classifyStudent(enrollment);
    
    if (category !== null) {
      stats[category]++;
    }
  });

  console.log('📈 Estatísticas finais:', stats);
  return stats;
}

// ===========================
// FUNÇÕES DE PROCESSAMENTO
// ===========================

/**
 * Filtra turmas por disciplina
 */
function filterClassesByDiscipline(
  classes: Class[],
  discipline: string
): Class[] {
  return classes.filter(
    (classObj) => classObj.topic.toLowerCase() === discipline.toLowerCase()
  );
}

/**
 * Ordena turmas por ano e semestre
 */
function sortClassesByPeriod(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.semester - b.semester;
  });
}

/**
 * Gera dados de analytics para uma disciplina específica
 */
export function generateAnalyticsForDiscipline(
  discipline: string,
  allClasses: Class[]
): AnalyticsData[] {
  const filteredClasses = filterClassesByDiscipline(allClasses, discipline);
  const sortedClasses = sortClassesByPeriod(filteredClasses);

  return sortedClasses.map((classObj) => ({
    discipline: classObj.topic,
    periodLabel: `${classObj.year}.${classObj.semester}`,
    year: classObj.year,
    semester: classObj.semester,
    statistics: calculateClassStatistics(classObj)
  }));
}

/**
 * Transforma os dados de analytics para o formato do gráfico
 */
export function transformToChartData(
  analyticsData: AnalyticsData[]
): ChartDataPoint[] {
  return analyticsData.map((item) => ({
    period: item.periodLabel,
    'APV. M': item.statistics.approvedByAverage,
    'APV. N': item.statistics.approvedByGrade,
    'REP. N': item.statistics.failedByGrade,
    'REP. M': item.statistics.failedByAverage,
    'REP. F': item.statistics.failedByAttendance,
  }));
}
