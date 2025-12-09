import React, { useState, useEffect, useCallback } from 'react';
import { Class, CreateClassRequest, getClassId } from '../types/Class';
import { Student } from '../types/Student';
import { ReportData } from '../types/Report';
import ClassService, { fetchClassReportsForComparison } from '../services/ClassService';
import { studentService } from '../services/StudentService';
import EnrollmentService from '../services/EnrollmentService';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA, EspecificacaoDoCalculoDaMedia } from '../types/EspecificacaoDoCalculoDaMedia';
import ClassReport from './ClassReport';
import ClassComparison, { MAX_COMPARISON_SELECTION } from './ClassComparison';

interface ClassesProps {
  classes: Class[];
  onClassAdded: () => void;
  onClassUpdated: () => void;
  onClassDeleted: () => void;
  onError: (errorMessage: string) => void;
}

const DEFAULT_FORM_DATA: CreateClassRequest = {
  topic: '',
  semester: 1,
  year: new Date().getFullYear(),
  especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
};

const Classes: React.FC<ClassesProps> = ({ 
  classes, 
  onClassAdded, 
  onClassUpdated, 
  onClassDeleted, 
  onError 
}) => {
  const [formData, setFormData] = useState<CreateClassRequest>(DEFAULT_FORM_DATA);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Student enrollment state
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollmentPanelClass, setEnrollmentPanelClass] = useState<Class | null>(null);
  const [selectedStudentsForEnrollment, setSelectedStudentsForEnrollment] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Report state - only track which class to show report for
  const [reportPanelClass, setReportPanelClass] = useState<Class | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Class comparison state
  const [selectedClassesForComparison, setSelectedClassesForComparison] = useState<Set<string>>(new Set());
  const [comparisonReports, setComparisonReports] = useState<{ [classId: string]: ReportData }>({});
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonViewType, setComparisonViewType] = useState<'table' | 'charts'>('charts');

  // Helper to reset form data
  const resetFormData = () => setFormData(DEFAULT_FORM_DATA);

  // Helper to reset enrollment panel state
  const resetEnrollmentPanel = () => {
    setEnrollmentPanelClass(null);
    setSelectedStudentsForEnrollment(new Set());
  };

  // Helper to clear comparison error
  const clearComparisonError = () => setComparisonError(null);

  // Load all students for enrollment dropdown
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

  // Handle enrollment form submission
  const handleBulkEnrollStudents = async () => {
    if (!enrollmentPanelClass || selectedStudentsForEnrollment.size === 0) {
      onError('Please select students to enroll');
      return;
    }

    setIsEnrolling(true);
    
    try {
      // Enroll each selected student
      const enrollmentPromises = Array.from(selectedStudentsForEnrollment).map(studentCPF =>
        EnrollmentService.enrollStudent(enrollmentPanelClass.id, studentCPF)
      );
      
      await Promise.all(enrollmentPromises);
      
      // Reset enrollment panel
      resetEnrollmentPanel();
      
      // Refresh class data
      onClassUpdated();
      
      onError(''); // Clear any previous errors
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Handle opening enrollment panel for a specific class
  const handleOpenEnrollmentPanel = (classObj: Class) => {
    setEnrollmentPanelClass(classObj);
    setSelectedStudentsForEnrollment(new Set());
  };

  // Handle closing enrollment panel
  const handleCloseEnrollmentPanel = () => {
    resetEnrollmentPanel();
  };

  // Handle student selection toggle
  const handleStudentToggle = (studentCPF: string) => {
    const newSelection = new Set(selectedStudentsForEnrollment);
    if (newSelection.has(studentCPF)) {
      newSelection.delete(studentCPF);
    } else {
      newSelection.add(studentCPF);
    }
    setSelectedStudentsForEnrollment(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (!enrollmentPanelClass) return;
    
    const availableStudents = getAvailableStudentsForClass(enrollmentPanelClass);
    setSelectedStudentsForEnrollment(new Set(availableStudents.map(s => s.cpf)));
  };

  const handleSelectNone = () => {
    setSelectedStudentsForEnrollment(new Set());
  };

  // Get students not enrolled in a specific class
  const getAvailableStudentsForClass = (classObj: Class): Student[] => {
    const enrolledStudentCPFs = new Set(classObj.enrollments.map(enrollment => enrollment.student.cpf));
    return allStudents.filter(student => !enrolledStudentCPFs.has(student.cpf));
  };

  // Handle opening report panel for a specific class
  const handleOpenReportPanel = async (classObj: Class) => {
    setReportPanelClass(classObj);
    setIsLoadingReport(true);
    
    try {
      const report = await ClassService.getClassReport(classObj.id);
      setReportData(report);
    } catch (error) {
      onError((error as Error).message);
      setReportPanelClass(null);
      clearComparisonError();
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Handle class selection for comparison
  const handleClassSelectionToggle = (classId: string) => {
    const newSelection = new Set(selectedClassesForComparison);

    if (newSelection.has(classId)) {
      newSelection.delete(classId);
      setSelectedClassesForComparison(newSelection);
      clearComparisonError();
      return;
    }

    // Trying to add
    if (newSelection.size >= MAX_COMPARISON_SELECTION) {
      setComparisonError(`You are not allowed to select more than ${MAX_COMPARISON_SELECTION} classes for comparison`);
      return;
    }

    newSelection.add(classId);
    setSelectedClassesForComparison(newSelection);
    clearComparisonError(); // Clear error on new selection
  };

  

  // Handle comparison button click
  const handleCompareClasses = async () => {
    const selectedIds = Array.from(selectedClassesForComparison);
    setIsLoadingComparison(true);
    clearComparisonError();
    // Pre-check: ensure at least 2 selected
    if (selectedIds.length < 2) {
      setComparisonError('Please select at least 2 classes to compare');
      setIsLoadingComparison(false);
      return;
    }

    // Check for classes with no enrollments and inform user with names
    const emptyClasses = selectedIds
      .map(id => classes.find(c => c.id === id))
      .filter(Boolean)
      .filter(c => (c as Class).enrollments.length === 0) as Class[];

    if (emptyClasses.length > 0) {
      const names = emptyClasses.map(c => c.topic);
      const first = names[0];
      const others = names.length - 1;
      const msg = others > 0
        ? `The class "${first}" and ${others} other(s) have no enrolled students`
        : `The class "${first}" has no enrolled students`;
      setComparisonError(msg);
      setIsLoadingComparison(false);
      return;
    }

    const result = await fetchClassReportsForComparison(selectedIds);

    if (result.error) {
      setComparisonError(result.error);
      setIsLoadingComparison(false);
      return;
    }

    setComparisonReports(result.reports);
    setIsLoadingComparison(false);
    clearComparisonError();
  };

  // Handle closing comparison view
  const handleCloseComparison = () => {
    setComparisonReports({});
    clearComparisonError();
  };

  // Additional comparison modal helpers
  const [addClassToComparison, setAddClassToComparison] = useState<string>('');
  const [pendingRemoveClassId, setPendingRemoveClassId] = useState<string | null>(null);
  const [showRemovalDecision, setShowRemovalDecision] = useState(false);

  const handleExportComparison = () => {
    const data = Array.from(selectedClassesForComparison).map(id => {
      const cls = classes.find(c => c.id === id);
      return {
        class: cls ? `${cls.topic} (${cls.year}/${cls.semester})` : id,
        report: comparisonReports[id]
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAddClassToComparison = async (classIdParam?: string) => {
    const classId = classIdParam ?? addClassToComparison;
    if (!classId) return;
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      setComparisonError(`You cannot add more than ${MAX_COMPARISON_SELECTION} classes to the comparison`);
      return;
    }

    const newSelection = new Set(selectedClassesForComparison);
    newSelection.add(classId);
    setSelectedClassesForComparison(newSelection);

    // Fetch report for newly added class
    try {
      const report = await ClassService.getClassReport(classId);
      setComparisonReports(prev => ({ ...prev, [classId]: report }));
      clearComparisonError();
      // clear controlled select value
      setAddClassToComparison('');
    } catch (err) {
      setComparisonError((err as Error).message || 'Failed to load report for the added class');
    }
  };

  const handleRemoveFromComparisonPrompt = (classId: string) => {
    // If removing would leave fewer than 2 classes, ask the user
    if (selectedClassesForComparison.size <= 2) {
      setPendingRemoveClassId(classId);
      setShowRemovalDecision(true);
      return;
    }

    // Otherwise remove immediately
    const newSelection = new Set(selectedClassesForComparison);
    newSelection.delete(classId);
    setSelectedClassesForComparison(newSelection);
    // also remove report
    const newReports = { ...comparisonReports };
    delete newReports[classId];
    setComparisonReports(newReports);
  };

  const handleConfirmClearDisplay = () => {
    setSelectedClassesForComparison(new Set());
    setComparisonReports({});
    setPendingRemoveClassId(null);
    setShowRemovalDecision(false);
    clearComparisonError();
  };

  const handleCancelRemovalDecision = () => {
    setPendingRemoveClassId(null);
    setShowRemovalDecision(false);
  };

  // Safe list of selected classes that have loaded reports
  const selectedClassesWithReports: Class[] = Array.from(selectedClassesForComparison)
    .map(id => classes.find(c => c.id === id))
    .filter((c): c is Class => {
      if (!c) return false;
      return Boolean(comparisonReports[c.id]);
    });

  // Toggle select first up-to-MAX_COMPARISON_SELECTION prioritized by availability of reports
  const handleToggleSelectAllVisible = () => {
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toSelect = prioritized.slice(0, Math.min(MAX, prioritized.length));

    const allSelected = toSelect.every(c => selectedClassesForComparison.has(c.id));
    if (allSelected) {
      setSelectedClassesForComparison(new Set());
      clearComparisonError();
      return;
    }

    const newSelection = new Set<string>(toSelect.map(c => c.id));
    setSelectedClassesForComparison(newSelection);
    clearComparisonError();
  };

  const headerAllSelected = (() => {
    if (!classes || classes.length === 0) return false;
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toCheck = prioritized.slice(0, Math.min(MAX, prioritized.length));
    return toCheck.length > 0 && toCheck.every(c => selectedClassesForComparison.has(c.id));
  })();

  // Selection info text for display (handles special message when many classes exist)
  const selectionInfoText = (() => {
    if (selectedClassesForComparison.size === 0) return 'Select at least 2 classes to compare';
    // Show clearer message when the user has reached the maximum allowed selection
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      return `Maximum of ${MAX_COMPARISON_SELECTION} classes selected`;
    }
    return `${selectedClassesForComparison.size} class${selectedClassesForComparison.size !== 1 ? 'es' : ''} selected`;
  })();

  // Handle closing report panel
  const handleCloseReportPanel = () => {
    setReportPanelClass(null);
    setReportData(null);
    clearComparisonError();
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'semester' || name === 'year' ? parseInt(value) : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      onError('Topic is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingClass) {
        // Update existing class
        await ClassService.updateClass(editingClass.id, formData);
        onClassUpdated();
        setEditingClass(null);
      } else {
        // Add new class
        await ClassService.addClass(formData);
        onClassAdded();
      }
      
      // Reset form
      resetFormData();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (classObj: Class) => {
    setEditingClass(classObj);
    setFormData(classObj);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingClass(null);
    resetFormData();
  };

  // Handle delete
  const handleDelete = async (classObj: Class) => {
    if (window.confirm(`Are you sure you want to delete the class "${classObj.topic} (${classObj.year}/${classObj.semester})"?`)) {
      try {
        await ClassService.deleteClass(classObj.id);
        onClassDeleted();
      } catch (error) {
        onError((error as Error).message);
      }
    }
  };

  // Generate current year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="classes-container">
      <h2>Class Management</h2>
      
      {/* Class Form */}
      <div className="class-form-container">
        <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
        <form onSubmit={handleSubmit} className="class-form">
          <div className="form-row topic-row">
            <div className="form-group">
              <label htmlFor="topic">Topic:</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineering, Introduction to Programming"
                required
              />
            </div>
          </div>

          <div className="form-row year-semester-row">
            <div className="form-group">
              <label htmlFor="year">Year:</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester:</label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                required
              >
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
            </button>
            {editingClass && (
              <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Classes List */}
      <div className="classes-list">
        <h3>Existing Classes ({classes.length})</h3>
        
        {classes.length === 0 ? (
          <div className="no-classes">
            No classes created yet. Add your first class using the form above.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input 
                      type="checkbox" 
                      title="Select visible classes for comparison"
                      checked={headerAllSelected}
                      onChange={handleToggleSelectAllVisible}
                    />
                  </th>
                  <th>Topic</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>Enrolled Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classObj) => (
                  <tr key={getClassId(classObj)}>
                    <td className="checkbox-col">
                      <input 
                        type="checkbox"
                        checked={selectedClassesForComparison.has(classObj.id)}
                        onChange={() => handleClassSelectionToggle(classObj.id)}
                        title="Select for comparison"
                      />
                    </td>
                    <td><strong>{classObj.topic}</strong></td>
                    <td><strong>{classObj.year}</strong></td>
                    <td><strong>{classObj.semester === 1 ? '1st Semester' : '2nd Semester'}</strong></td>
                    <td>{classObj.enrollments.length}</td>
                    <td>
                      <div className="actions-grid">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(classObj)}
                          title="Edit class"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(classObj)}
                          title="Delete class"
                        >
                          Delete
                        </button>
                        <button
                          className="enroll-btn"
                          onClick={() => handleOpenEnrollmentPanel(classObj)}
                          title="Enroll students"
                        >
                          Enroll
                        </button>
                        <button
                          className="report-btn"
                          onClick={() => handleOpenReportPanel(classObj)}
                          title="View class report"
                        >
                          Report
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Comparison Controls */}
            {classes.length > 1 && (
              <div className="comparison-controls">
                <p className="selection-info">{selectionInfoText}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="compare-btn"
                    onClick={handleCompareClasses}
                    disabled={selectedClassesForComparison.size < 2 || isLoadingComparison}
                  >
                    {isLoadingComparison ? 'Loading...' : `Compare (${selectedClassesForComparison.size})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modern Enrollment Panel */}
      {enrollmentPanelClass && (
        <div className="enrollment-overlay">
          <div className="enrollment-modal">
            <div className="enrollment-modal-header">
              <h3>Enroll Students in {enrollmentPanelClass.topic}</h3>
              <button 
                className="close-modal-btn"
                onClick={handleCloseEnrollmentPanel}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="enrollment-modal-content">
              {/* Currently Enrolled Students */}
              <div className="current-enrollments">
                <h4>Currently Enrolled ({enrollmentPanelClass.enrollments.length}):</h4>
                {enrollmentPanelClass.enrollments.length === 0 ? (
                  <p className="no-enrollments">No students enrolled yet</p>
                ) : (
                  <div className="enrolled-students-list">
                    {enrollmentPanelClass.enrollments.map(enrollment => (
                      <span key={enrollment.student.cpf} className="enrolled-badge">
                        {enrollment.student.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Students to Enroll */}
              <div className="available-students">
                <div className="available-students-header">
                  <h4>Available Students ({getAvailableStudentsForClass(enrollmentPanelClass).length}):</h4>
                  <div className="selection-controls">
                    <button 
                      type="button"
                      className="select-all-btn"
                      onClick={handleSelectAll}
                      disabled={getAvailableStudentsForClass(enrollmentPanelClass).length === 0}
                    >
                      Select All
                    </button>
                    <button 
                      type="button"
                      className="select-none-btn"
                      onClick={handleSelectNone}
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {getAvailableStudentsForClass(enrollmentPanelClass).length === 0 ? (
                  <p className="no-available-students">All registered students are already enrolled in this class</p>
                ) : (
                  <div className="students-grid">
                    {getAvailableStudentsForClass(enrollmentPanelClass).map(student => (
                      <div 
                        key={student.cpf} 
                        className={`student-card ${selectedStudentsForEnrollment.has(student.cpf) ? 'selected' : ''}`}
                        onClick={() => handleStudentToggle(student.cpf)}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedStudentsForEnrollment.has(student.cpf)}
                          onChange={() => handleStudentToggle(student.cpf)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="student-info">
                          <div className="student-name">{student.name}</div>
                          <div className="student-cpf">{student.cpf}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="enrollment-actions">
                <button 
                  className="cancel-btn"
                  onClick={handleCloseEnrollmentPanel}
                >
                  Cancel
                </button>
                <button 
                  className="enroll-selected-btn"
                  onClick={handleBulkEnrollStudents}
                  disabled={isEnrolling || selectedStudentsForEnrollment.size === 0}
                >
                  {isEnrolling 
                    ? 'Enrolling...' 
                    : `Enroll ${selectedStudentsForEnrollment.size} Student${selectedStudentsForEnrollment.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Panel */}
      {reportPanelClass && (
        <ClassReport
          classObj={reportPanelClass}
          onClose={handleCloseReportPanel}
          onError={onError}
        />
      )}

      { /* Class Comparisson */ }
      {Object.keys(comparisonReports).length > 0 && (
        <ClassComparison
          classes={classes}
          selectedClassesForComparison={selectedClassesForComparison}
          comparisonReports={comparisonReports}
          comparisonError={comparisonError}
          comparisonViewType={comparisonViewType}
          setComparisonViewType={setComparisonViewType}
          addClassToComparison={addClassToComparison}
          setAddClassToComparison={setAddClassToComparison}
          handleAddClassToComparison={handleAddClassToComparison}
          handleRemoveFromComparisonPrompt={handleRemoveFromComparisonPrompt}
          handleExportComparison={handleExportComparison}
          handleCloseComparison={handleCloseComparison}
          showRemovalDecision={showRemovalDecision}
          handleConfirmClearDisplay={handleConfirmClearDisplay}
          handleCancelRemovalDecision={handleCancelRemovalDecision}
        />
      )}
    </div>
  );
};

export default Classes;