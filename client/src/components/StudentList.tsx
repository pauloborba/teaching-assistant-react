import React from 'react';
import { Student } from '../types/Student';
import { StudentStatus } from '../types/StudentStatusColor';
import { studentService } from '../services/StudentService';

interface StudentListProps {
  students: Student[];
  studentsStatus?: StudentStatus[];
  onStudentDeleted: () => void;
  onEditStudent: (student: Student) => void;
  onError: (errorMessage: string) => void;
  loading: boolean;
}

const StudentList: React.FC<StudentListProps> = ({ 
  students,
  studentsStatus,
  onStudentDeleted, 
  onEditStudent, 
  onError, 
  loading 
}) => {
  const handleDelete = async (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      try {
        await studentService.deleteStudent(student.cpf);
        onStudentDeleted();
      } catch (error) {
        onError((error as Error).message);
      }
    }
  };

  const handleEdit = (student: Student) => {
    onEditStudent(student);
  };

  const getBorderColor = (cpf: string): string => {
    if (!studentsStatus || studentsStatus.length === 0) {
      return 'transparent';
    }

    const normalizedCpf = cpf.replace(/[.\-\s]/g, '');
    
    const status = studentsStatus.find(s => {
      const statusCpf = String(s.student?.cpf || '').replace(/[.\-\s]/g, '');
      return statusCpf === normalizedCpf;
    });
    
    if (!status) {
      return 'transparent';
    }

    if (status.statusColor === 'green') return '#22c55e';
    if (status.statusColor === 'yellow') return '#eab308';
    if (status.statusColor === 'red') return '#ef4444';

    return 'transparent';
  };

  if (loading) {
    return (
      <div className="students-list">
        <h2>Students ({students.length})</h2>
        <div className="loading">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="students-list">
      <h2>Students ({students.length})</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.cpf}
                data-testid={`student-row-${student.cpf}`}
                style={{ borderLeft: `6px solid ${getBorderColor(student.cpf)}` }}
              >
                <td></td>
                <td data-testid="student-name">{student.name}</td>
                <td data-testid="student-cpf">{student.cpf}</td>
                <td data-testid="student-email">{student.email}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(student)}>Edit</button>
                  <button
                    className="delete-btn"
                    data-testid={`delete-student-${student.cpf}`}
                    onClick={() => handleDelete(student)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(StudentList);