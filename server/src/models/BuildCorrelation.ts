import { Class } from './Class';
import { DomainError } from './DomainError';
import { ComputeCorrelation } from './ComputeCorrelation';

export interface CorrelationResult {
  firstVariable: CorrelationVariable;
  firstVariableLabel: string;
  secondVariable: CorrelationVariable;
  secondVariableLabel: string;
  dataPoints: number;
  value: number;
  interpretation: string;
}

export const CORRELATION_VARIABLES = [
  { value: 'attendanceRate', label: 'Attendance rate' },
  { value: 'overallAverage', label: 'Overall average' },
  { value: 'Requirements', label: 'Requirements' },
  { value: 'Configuration Management', label: 'Configuration Management' },
  { value: 'Project Management', label: 'Project Management' },
  { value: 'Design', label: 'Design' },
  { value: 'Tests', label: 'Tests' },
  { value: 'Refactoring', label: 'Refactoring' }
] as const;

export type CorrelationVariable = typeof CORRELATION_VARIABLES[number]['value'];

const gradeValue: Record<string, number> = { MANA: 1, MPA: 2, MA: 3 };

const enrollmentResult = (classObj: Class, enrollmentIndex: number, variable: CorrelationVariable): number | undefined => {
  const enrollment = classObj.getEnrollments()[enrollmentIndex];
  if (!enrollment) return undefined;
  if (variable === 'attendanceRate') {
    return enrollment.getFailedByAbsence() ? 0 : 1;
  }
  const evaluations = enrollment.getEvaluations();
  const grades = evaluations
    .filter(evaluation => variable === 'overallAverage' || evaluation.getGoal() === variable)
    .map(evaluation => gradeValue[evaluation.getGrade()])
    .filter((grade): grade is number => grade !== undefined);
  return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : undefined;
};

const classResult = (classObj: Class, variable: CorrelationVariable): number | undefined => {
  const values = classObj.getEnrollments()
    .map((_, index) => enrollmentResult(classObj, index, variable))
    .filter((value): value is number => value !== undefined);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
};

/** Builds correlation data for every requested pair of existing classes. */
export function BuildCorrelation(
  classes: Class[],
  classIds: string[],
  variables: [CorrelationVariable, CorrelationVariable]
): CorrelationResult[] {
  if (classIds.length < 2) {
    throw new DomainError('Select at least two classes');
  }
  if (variables.length !== 2 || variables[0] === variables[1]) {
    throw new DomainError('Select two different variables');
  }

  const selected = classIds
    .map(id => classes.find(classObj => classObj.getClassId() === id))
    .filter((classObj): classObj is Class => classObj !== undefined);
  if (selected.length !== classIds.length) {
    throw new DomainError('One or more selected classes were not found');
  }

  const values: [number[], number[]] = [[], []];
  selected.forEach(classObj => {
    const firstValue = classResult(classObj, variables[0]);
    const secondValue = classResult(classObj, variables[1]);
    if (firstValue !== undefined && secondValue !== undefined) {
      values[0].push(firstValue);
      values[1].push(secondValue);
    }
  });

  if (values[0].length < 2) {
    return [];
  }
  let value = 0;
  const firstVaries = new Set(values[0]).size > 1;
  const secondVaries = new Set(values[1]).size > 1;
  if (firstVaries && secondVaries) {
    value = new ComputeCorrelation().compute(values);
  }
  const firstOption = CORRELATION_VARIABLES.find(option => option.value === variables[0])!;
  const secondOption = CORRELATION_VARIABLES.find(option => option.value === variables[1])!;
  return [{
    firstVariable: variables[0],
    firstVariableLabel: firstOption.label,
    secondVariable: variables[1],
    secondVariableLabel: secondOption.label,
    dataPoints: values[0].length,
    value,
    interpretation: interpret(value)
  }];
}

export function interpret(value: number): string {
  const strength = Math.abs(value);
  if (strength >= 0.7) return value > 0 ? 'Strong positive correlation' : 'Strong negative correlation';
  if (strength >= 0.3) return value > 0 ? 'Moderate positive correlation' : 'Moderate negative correlation';
  return 'Weak or no correlation';
}
