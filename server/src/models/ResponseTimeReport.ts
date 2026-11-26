/**
 * Dados de um aluno em um roteiro específico.
 * responseTime é informado em minutos.
 */
export interface StudentResponseData {
  studentId: string;
  name: string;
  grade: number;
  responseTime: number;
}

export type CorrelationClassification =
  | 'perfect positive correlation'
  | 'positive correlation'
  | 'no linear correlation'
  | 'negative correlation'
  | 'perfect negative correlation';

export interface ResponseTimeReportData {
  averageResponseTime: number;
  averageGrade: number;
  standardDeviationResponseTime: number;
  standardDeviationGrade: number;
  correlationCoefficient: number | null;
  correlationClassification: CorrelationClassification | null;
  correlationError: string | null;
}

export class ResponseTimeReport {
  private readonly students: StudentResponseData[];

  constructor(students: StudentResponseData[]) {
    if (students.length === 0) {
      throw new Error('No student response data provided');
    }

    students.forEach((student) => this.validateStudentData(student));

    // Copia a lista para evitar que o relatório altere os dados recebidos.
    this.students = students.map((student) => ({ ...student }));
  }

  /** Gera todas as estatísticas do roteiro. */
  public generate(): ResponseTimeReportData {
    const grades = this.students.map((student) => student.grade);
    const responseTimes = this.students.map((student) => student.responseTime);
    const correlation = this.calculateCorrelation(responseTimes, grades);

    return {
      averageResponseTime: this.round(this.calculateAverage(responseTimes)),
      averageGrade: this.round(this.calculateAverage(grades)),
      standardDeviationResponseTime: this.round(
        this.calculateStandardDeviation(responseTimes)
      ),
      standardDeviationGrade: this.round(this.calculateStandardDeviation(grades)),
      correlationCoefficient: correlation,
      correlationClassification:
        correlation === null ? null : this.classifyCorrelation(correlation),
      correlationError:
        correlation === null
          ? this.students.length < 2
            ? 'Insufficient data to calculate correlation'
            : 'Correlation cannot be calculated when all response times or grades are equal'
          : null
    };
  }

  private validateStudentData(student: StudentResponseData): void {
    if (!student.studentId || !student.name.trim()) {
      throw new Error('Student ID and name are required');
    }

    if (!Number.isFinite(student.grade) || student.grade < 0 || student.grade > 10) {
      throw new Error('Grade must be a number between 0 and 10');
    }

    if (!Number.isFinite(student.responseTime) || student.responseTime < 0) {
      throw new Error('Response time must be a non-negative number');
    }
  }

  private calculateAverage(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /** Calcula o desvio padrão populacional (divide por N). */
  private calculateStandardDeviation(values: number[]): number {
    const average = this.calculateAverage(values);
    const squaredDifferences = values.map((value) => Math.pow(value - average, 2));
    const variance = this.calculateAverage(squaredDifferences);

    return Math.sqrt(variance);
  }

  /** Calcula o coeficiente de correlação de Pearson. */
  private calculateCorrelation(xValues: number[], yValues: number[]): number | null {
    if (xValues.length < 2 || yValues.length < 2) {
      return null;
    }

    const xAverage = this.calculateAverage(xValues);
    const yAverage = this.calculateAverage(yValues);

    let numerator = 0;
    let xSquaredDifferences = 0;
    let ySquaredDifferences = 0;

    for (let i = 0; i < xValues.length; i++) {
      const xDifference = xValues[i] - xAverage;
      const yDifference = yValues[i] - yAverage;

      numerator += xDifference * yDifference;
      xSquaredDifferences += Math.pow(xDifference, 2);
      ySquaredDifferences += Math.pow(yDifference, 2);
    }

    const denominator = Math.sqrt(xSquaredDifferences * ySquaredDifferences);

    // A correlação é indefinida se todos os tempos ou todas as notas forem iguais.
    if (denominator === 0) {
      return null;
    }

    return this.round(numerator / denominator);
  }

  private classifyCorrelation(coefficient: number): CorrelationClassification {
    const epsilon = 0.000001;

    if (Math.abs(coefficient - 1) < epsilon) {
      return 'perfect positive correlation';
    }

    if (Math.abs(coefficient + 1) < epsilon) {
      return 'perfect negative correlation';
    }

    if (Math.abs(coefficient) < epsilon) {
      return 'no linear correlation';
    }

    return coefficient > 0 ? 'positive correlation' : 'negative correlation';
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
