import React from 'react';
import { Student } from '../types/Student';

interface StudentListProps {
  students: Student[];
  loading: boolean;
}

const ExamList: React.FC<StudentListProps> = ({ 
  students, 
  loading 
}) => {

  if (loading) {
    return (
      <div className="students-list">
        <h2>Alunos ({students.length})</h2>
        <div className="loading">Carregando alunos...</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="students-list">
        <h2>Alunos (0)</h2>
        <div className="no-students">
          Nenhum aluno registrado nessa prova.
        </div>
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
              <th>Nome</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.cpf}>
                <td>{student.name}</td>
                <td>{student.cpf}</td>
                <td>{student.email}</td>
                <td>
                  <div
                    style={{
                        padding: "12px 16px",
                        backgroundColor: student.exam?.grade !== undefined ? "#4caf50" : "#f44336",
                        color: "white",
                        borderRadius: "8px",
                        display: "inline-block",
                        fontWeight: "bold",
                        cursor: "default", // não é clicável
                        opacity: 0.9
                    }}
                    >
                    {student.exam?.grade !== undefined ? student.exam.grade : "Não corrigido"}
                </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamList;