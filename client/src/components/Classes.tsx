import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import { Student } from '../types/Student';
import { studentService } from '../services/StudentService';
import ClassForm from './ClassForm';
import ClassList from './ClassList';
import EnrollmentModal from './EnrollmentModal';
import CorrelationSection from './CorrelationSection';

interface ClassesProps {
  classes: Class[];
  onClassAdded: () => void;
  onClassUpdated: () => void;
  onClassDeleted: () => void;
  onError: (errorMessage: string) => void; // An empty message clears the error shown
}

/** The Classes tab: class form, class list and the student enrollment modal. */
const Classes: React.FC<ClassesProps> = ({
  classes,
  onClassAdded,
  onClassUpdated,
  onClassDeleted,
  onError
}) => {
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollmentModalClass, setEnrollmentModalClass] = useState<Class | null>(null);

  // Load all students for the enrollment modal
  const loadAllStudents = useCallback(async () => {
    try {
      const students = await studentService.getAllStudents();
      setAllStudents(students);
    } catch (error) {
      onError('Failed to load students for enrollment');
    }
  }, [onError]);

  useEffect(() => {
    loadAllStudents();
  }, [loadAllStudents]);

  const handleClassUpdated = () => {
    setEditingClass(null);
    onClassUpdated();
  };

  const handleStudentsEnrolled = () => {
    setEnrollmentModalClass(null);
    onClassUpdated(); // Refresh class data
    onError(''); // Clear any previous errors
  };

  return (
    <div className="classes-container">
      <h2>Class Management</h2>

      <ClassForm
        editingClass={editingClass}
        onClassAdded={onClassAdded}
        onClassUpdated={handleClassUpdated}
        onCancelEdit={() => setEditingClass(null)}
        onError={onError}
      />

      <ClassList
        classes={classes}
        onEditClass={setEditingClass}
        onClassDeleted={onClassDeleted}
        onEnrollStudents={setEnrollmentModalClass}
        onError={onError}
      />

      <CorrelationSection classes={classes} onError={onError} />

      {enrollmentModalClass && (
        <EnrollmentModal
          classObj={enrollmentModalClass}
          allStudents={allStudents}
          onClose={() => setEnrollmentModalClass(null)}
          onStudentsEnrolled={handleStudentsEnrolled}
          onError={onError}
        />
      )}
    </div>
  );
};

export default Classes;
