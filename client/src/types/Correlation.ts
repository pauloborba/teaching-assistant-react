export interface CorrelationResult {
  firstVariable: string;
  firstVariableLabel: string;
  secondVariable: string;
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
