import React from "react";
import { Student } from "../types/Student";
import { studentService } from "../services/StudentService";

interface StudentListProps {
  students: Student[];
  onStudentDeleted: () => void;
  onEditStudent: (student: Student) => void;
  onError: (errorMessage: string) => void;
  loading: boolean;
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  onStudentDeleted,
  onEditStudent,
  onError,
  loading,
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

  if (loading) {
    return (
      <div className="students-list">
        <h2>Students ({students.length})</h2>
        <div className="loading">Loading students...</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="students-list">
        <h2>Students (0)</h2>
        <div className="no-students">
          No students registered yet. Add your first student using the form
          above.
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
              <th>Name</th>
              <th>CPF</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.cpf} data-testid={`student-row-${student.cpf}`}>
                <td data-testid="student-name">{student.name}</td>
                <td data-testid="student-cpf">{student.cpf}</td>
                <td data-testid="student-email">{student.email}</td>
                <td>
                  <button
                    className="edit-btn"
                    data-testid={`edit-student-${student.cpf}`}
                    onClick={() => handleEdit(student)}
                    title="Edit student"
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    data-testid={`delete-student-${student.cpf}`}
                    onClick={() => handleDelete(student)}
                    title="Delete student"
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

export default StudentList;