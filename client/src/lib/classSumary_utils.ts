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

//TALVEZ TENHA COMO TIRAR ESSA INTERFACE PARA SIMPLIFICAR AS DECLARAÇÕES
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

export interface ClassSumaryProps {
  data: Class[] | null;
  discipline?: string;
  selectedPeriodsCount?: number;
  totalPeriodsCount?: number;
}

type StudentCategory = keyof Omit<CategoryStatistics, 'totalStudents'>;

// ===========================
// FUNÇÕES DE CLASSIFICAÇÃO
// ===========================

function classifyStudent(enrollment: Enrollment): StudentCategory | null {
  // Acessar diretamente as propriedades do objeto (vem como JSON plain object)
  const enrollmentData = enrollment as any;
  
  const reprovadoPorFalta = enrollmentData.reprovadoPorFalta ?? false;
  const mediaPosFinal = enrollmentData.mediaPosFinal ?? 0;
  const mediaPreFinal = enrollmentData.mediaPreFinal ?? 0;

  // 1. Verificar reprovação por falta (prioridade máxima)
  if (reprovadoPorFalta) {
    return 'failedByAttendance';
  }

  // 2. Aprovado pela média (não precisou da prova final)
  if (mediaPreFinal >= 7.0) {
    return 'approvedByAverage';
  }

  // 3. Aluno fez prova final (média pré-final entre 3.0 e 7.0)
  if (mediaPreFinal >= 3.0 && mediaPreFinal < 7.0) {
    // Aprovado pela nota final
    if (mediaPosFinal >= 5.0) {
      return 'approvedByGrade';
    }
    // Reprovado pela nota final
    return 'failedByGrade';
  }

  // 4. Reprovado pela média baixa (média pré-final < 3.0)
  return 'failedByAverage';
}

function calculateClassStatistics(classObj: Class): CategoryStatistics {
  const enrollments = classObj.enrollments || [];
  
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

  return stats;
}

// ===========================
// FUNÇÕES DE PROCESSAMENTO
// ===========================

function filterClassesByDiscipline(
  classes: Class[],
  discipline: string
): Class[] {
  return classes.filter(
    (classObj) => classObj.topic.toLowerCase() === discipline.toLowerCase()
  );
}

function sortClassesByPeriod(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.semester - b.semester;
  });
}

function generateAnalyticsForDiscipline(
  sortedClasses: Class[]
): AnalyticsData[] {
  return sortedClasses.map((classObj) => ({
    discipline: classObj.topic,
    periodLabel: `${classObj.year}.${classObj.semester}`,
    year: classObj.year,
    semester: classObj.semester,
    statistics: calculateClassStatistics(classObj)
  }));
}

function transformToChartData(
  discipline: string,
  allClasses: Class[],
): ChartDataPoint[] {
  const filteredClasses = filterClassesByDiscipline(allClasses, discipline);
  const sortedClasses = sortClassesByPeriod(filteredClasses);
  const analyticsData = generateAnalyticsForDiscipline(sortedClasses);

  return analyticsData.map((item) => ({
    period: item.periodLabel,
    'APV. M': item.statistics.approvedByAverage,
    'APV. N': item.statistics.approvedByGrade,
    'REP. N': item.statistics.failedByGrade,
    'REP. M': item.statistics.failedByAverage,
    'REP. F': item.statistics.failedByAttendance,
  }));
}

// ===============================
// FUNÇÃO DE PROCESSAMENTO PRINCIPAL
// ===============================

/**
 * Processa os dados de analytics para uma disciplina específica
 * @param discipline - Nome da disciplina
 * @param data - Array de classes
 * @returns Dados formatados para o gráfico ou null se não houver dados
 */
function processClassAnalytics(
  discipline: string | undefined,
  data: Class[] | null | undefined
): ChartDataPoint[] | null {
  // Validações iniciais
  if (!discipline) {
    //console.warn('⚠️ Disciplina não fornecida');
    return null;
  }

  if (!data || data.length === 0) {
    //console.warn('⚠️ Dados não fornecidos ou vazios');
    return null;
  }

  try {
    // Gerar analytics para a disciplina específica
    // Transformar para formato do gráfico
    const transformedData = transformToChartData(discipline, data);

    return transformedData;
  } catch (err) {
    //console.error('❌ Erro ao processar analytics:', err);
    throw new Error('Falha ao processar os dados de analytics');
  }
}

export {
  processClassAnalytics
};