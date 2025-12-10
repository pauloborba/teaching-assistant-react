import { Student } from './Student';

export type StudentStatusColor = 'green' | 'yellow' | 'red';

export interface StudentStatus {
  student: Student;
  mediaAluno: number;
  mediaTurma: number;
  temReprovacaoAnterior: boolean;
  statusColor: StudentStatusColor;
}
