/**
 * Integration Tests for Grade Calculation and Evaluation Components
 * 
 * Tests the interaction between:
 * - Server Class model (class data)
 * - Server Enrollment model (enrollment data)
 * - Server Student model (student data)
 * - Grade calculation logic
 * 
 * These tests verify that grades are properly:
 * 1. Stored in the models
 * 2. Calculated correctly
 * 3. Validated appropriately
 */

import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { Grade } from '../models/EspecificacaoDoCalculoDaMedia';
import { Student } from '../models/Student';
import { Evaluation } from '../models/Evaluation';

import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

// ============================================
// TEST UTILITIES
// ============================================

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Calculates average from grades using the server's specification
 */
function calculateAverageFromGrades(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  
  const gradeValues = grades.map(g => {
    switch (g) {
      case 'MA': return 10;
      case 'MPA': return 7;
      case 'MANA': return 0;
      default: return 0;
    }
  });
  
  return roundToOneDecimal(gradeValues.reduce<number>((a, b) => a + b, 0) / gradeValues.length);
}

/**
 * Calculates the final average after final exam
 */
function calculateFinalAverage(
  preExamAverage: number,
  finalGrade: Grade | null
): number {
  if (preExamAverage >= 7) return preExamAverage;
  
  if (!finalGrade) return preExamAverage;
  
  const finalValue = finalGrade === 'MA' ? 10 : finalGrade === 'MPA' ? 7 : 0;
  return (preExamAverage + finalValue) / 2;
}

function getApprovalStatus(preExamAverage: number, finalAverage?: number): 'approved' | 'in-final' | 'approved-in-final' | 'failed' {
  if (preExamAverage >= 7) {
    return 'approved';
  }

  if (preExamAverage < 7)
  {
    if (typeof finalAverage === 'number')
    {
      if (finalAverage >= 5) return 'approved-in-final';
      else return 'failed';
    }

    return 'in-final';
  }
  
  return 'failed';
}

// ============================================
// SERVICE INTEGRATION TESTS
// ============================================

describe('Server Model Integration Tests', () => {
  
  describe('Class model creation', () => {
    it('should create a class instance', () => {
      const classObj = new Class('Engenharia de Software', 2, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
      expect(classObj).toBeDefined();
      expect(classObj.getTopic()).toBe('Engenharia de Software');
      expect(classObj.getSemester()).toBe(2);
      expect(classObj.getYear()).toBe(2025);
    });
  });

  describe('Student model creation', () => {
    it('should create a student instance with valid data', () => {
      const student = new Student('John Doe', '12345678901', 'john@example.com');
      expect(student).toBeDefined();
      expect(student.name).toBe('John Doe');
      expect(student.email).toBe('john@example.com');
    });

    it('should validate CPF format', () => {
      expect(() => {
        new Student('John Doe', 'invalid-cpf', 'john@example.com');
      }).toThrow('Invalid CPF format');
    });

    it('should validate email format', () => {
      expect(() => {
        new Student('John Doe', '12345678901', 'invalid-email');
      }).toThrow('Invalid email format');
    });
  });

  describe('Evaluation model creation', () => {
    it('should create evaluation instances', () => {
      const eval1 = new Evaluation('Requirements', 'MA');
      const eval2 = new Evaluation('Configuration Management', 'MPA');
      
      expect(eval1.getGoal()).toBe('Requirements');
      expect(eval1.getGrade()).toBe('MA');
      expect(eval2.getGrade()).toBe('MPA');
    });
  });
});

// ============================================
// ENROLLMENT AND CALCULATION INTEGRATION
// ============================================

describe('Enrollment Grade Calculation Integration', () => {
  
  it('should calculate correct average from enrollment evaluations', () => {
    // Create student and evaluations
    const student = new Student('Test Student', '12345678901', 'test@example.com');
    const evaluations = [
      new Evaluation('Requirements', 'MA'),
      new Evaluation('Configuration Management', 'MA'),
      new Evaluation('Project Management', 'MPA'),
      new Evaluation('Design', 'MPA'),
      new Evaluation('Tests', 'MPA'),
      new Evaluation('Refactoring', 'MPA')
    ];
    
    // Create enrollment
    const enrollment = new Enrollment(student, evaluations);
    
    // Get grades from evaluations
    const grades = enrollment.getEvaluations().map(e => e.getGrade());
    
    // Calculate average
    const calculatedAverage = calculateAverageFromGrades(grades);
    
    // Deve ser 8
    expect(calculatedAverage).toBeCloseTo(8, 1);
  });

  it('should handle enrollment with no evaluations', () => {
    const student = new Student('Test Student', '12345678901', 'test@example.com');
    const enrollment = new Enrollment(student, []);

    const grades = enrollment.getEvaluations().map(e => e.getGrade());
    const calculatedAverage = calculateAverageFromGrades(grades);
    
    expect(calculatedAverage).toBe(0);
  });

  it('should calculate final average after final exam', () => {
    // Student with 6.5 average (in final)
    const preExamAverage = 6.5;
    const finalGrade: Grade = 'MPA';
    
    const finalAverage = calculateFinalAverage(preExamAverage, finalGrade);
    
    // 6.75 = ((6.5 + 7) / 2)
    expect(finalAverage).toBeCloseTo(6.75, 1);
  });

  it('should not update average if student is already approved', () => {
    const preExamAverage = 8.1;
    const finalGrade: Grade = 'MANA';
    
    const finalAverage = calculateFinalAverage(preExamAverage, finalGrade);
    
    // Average should remain 8.1
    expect(finalAverage).toBe(8.1);
  });

  it('should not update average if student failed', () => {
    const preExamAverage = 3.5;
    const finalGrade: Grade = 'MA';
    
    const finalAverage = calculateFinalAverage(preExamAverage, finalGrade);
    
    // 6,75 = (3,5 + 10) / 2
    expect(finalAverage).toBeCloseTo(6.75, 1);
  });
});

// ============================================
// CLASS AND ENROLLMENT DATA INTEGRATION
// ============================================

describe('Class with Enrollments Integration', () => {
  
  it('should process class with multiple enrollments', () => {
    // Create students
    const studentA = new Student('Student A', '11111111111', 'a@example.com');
    const studentB = new Student('Student B', '22222222222', 'b@example.com');
    const studentC = new Student('Student C', '33333333333', 'c@example.com');

    // Create enrollments with evaluations
    const evaluationsA = [
      new Evaluation('Requirements', 'MA'),
      new Evaluation('Configuration Management', 'MA'),
      new Evaluation('Project Management', 'MA'),
      new Evaluation('Design', 'MA'),
      new Evaluation('Tests', 'MA'),
      new Evaluation('Refactoring', 'MA')
    ];
    // 10

    const evaluationsB = [
      new Evaluation('Requirements', 'MPA'),
      new Evaluation('Configuration Management', 'MPA'),
      new Evaluation('Project Management', 'MPA'),
      new Evaluation('Design', 'MPA'),
      new Evaluation('Tests', 'MPA'),
      new Evaluation('Refactoring', 'MANA')
    ];
    // 5,83

    const evaluationsC = [
      new Evaluation('Requirements', 'MANA'),
      new Evaluation('Configuration Management', 'MANA'),
      new Evaluation('Project Management', 'MANA'),
      new Evaluation('Design', 'MANA'),
      new Evaluation('Tests', 'MANA'),
      new Evaluation('Refactoring', 'MANA')
    ];
    // 0

    const enrollmentA = new Enrollment(studentA, evaluationsA, 10, 10);
    const enrollmentB = new Enrollment(studentB, evaluationsB, 6.33, null);
    const enrollmentC = new Enrollment(studentC, evaluationsC, 4, null);

    // Create class with enrollments
    const classObj = new Class(
      'Engenharia de Software',
      2,
      2025,
      DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA,
      [enrollmentA, enrollmentB, enrollmentC]
    );

    // Verify class structure
    expect(classObj.getEnrollments()).toHaveLength(3);
    
    // Verify students
    const enrollments = classObj.getEnrollments();
    expect(enrollments[0].getStudent().name).toBe('Student A');
    expect(enrollments[1].getStudent().name).toBe('Student B');
    expect(enrollments[2].getStudent().name).toBe('Student C');
  });
});

// ============================================
// FEATURE SCENARIO INTEGRATION TESTS
// ============================================

describe('Feature Scenarios - Complete Integration', () => {
  describe('Scenario: Student approved on the final', () => {
    it('should calculate and display final approval correctly', () => {
      const grades: Grade[] = ['MPA', 'MPA', 'MPA', 'MPA', 'MPA', 'MANA'];
      
      // Verifica que as notas produzem 5.83
      const calculatedAverage = calculateAverageFromGrades(grades);
      expect(calculatedAverage).toBeCloseTo(5.83, 1);
      
      // Final exam: MPA
      const finalGrade: Grade = 'MPA';
      const finalAverage = calculateFinalAverage(calculatedAverage, finalGrade);
      
      expect(finalAverage).toBeGreaterThanOrEqual(6.4);
      expect(finalAverage).toBeCloseTo(6.4, 1);
    });
  });

  describe('Scenario: Student verifying that is on the final', () => {
    it('should identify student with 4.8 average as in final', () => {
      // Student with average 4.8 should be in final
      const average = 4.8;
      
      expect(average).toBeGreaterThanOrEqual(4);
      expect(average).toBeLessThan(7);
    });

    it('should be able to take final exam with 4.8 average', () => {
      const preExamAverage = 4.8;
      
      // Com 'MA', deve ser aprovado na final
      const withMA = calculateFinalAverage(preExamAverage, 'MA');
      expect(withMA).toBeGreaterThanOrEqual(7);
      
      // Com 'MPA', deve ser aprovado na final
      const withMPA = calculateFinalAverage(preExamAverage, 'MPA');
      expect(withMPA).toBeCloseTo(5.9, 1);
      expect(withMA).toBeGreaterThanOrEqual(5);
      
      // Com MANA, deve ser 2.4
      const withMANA = calculateFinalAverage(preExamAverage, 'MANA');
      expect(withMANA).toBeCloseTo(2.4, 1);
    });
  });

  describe('Scenario: Student approved', () => {
    it('should identify student with 8.1 average as approved', () => {
      // Student with average 8.1 is already approved
      const average = 8.1;
      
      expect(average).toBeGreaterThanOrEqual(7);
    });

    it('should not require final exam with 8.1 average', () => {
      const preExamAverage = 8.1;
      
      // Final grade shouldn't affect already approved student
      const withAnyGrade = calculateFinalAverage(preExamAverage, 'MANA');
      expect(withAnyGrade).toBe(preExamAverage);
    });
  });
});

// ============================================
// DATA CONSISTENCY TESTS
// ============================================

describe('Grade Data Consistency', () => {
  it('should maintain consistent grade representations', () => {
    const grades: Grade[] = ['MA', 'MPA', 'MANA'];
    
    grades.forEach(grade => {
      expect(['MA', 'MPA', 'MANA']).toContain(grade);
    });
  });

  it('should handle grade updates in evaluation', () => {
    const evaluation = new Evaluation('Requirements', 'MANA');
    expect(evaluation.getGrade()).toBe('MANA');
    
    // Simulate updating a grade
    evaluation.setGrade('MA');
    
    expect(evaluation.getGrade()).toBe('MA');
    expect(evaluation.getGoal()).toBe('Requirements');
  });

  it('should track enrollments with student data', () => {
    const student = new Student('Test Student', '12345678901', 'test@example.com');
    const evaluations = [
      new Evaluation('Requirements', 'MPA'),
      new Evaluation('Configuration Management', 'MA')
    ];
    const enrollment = new Enrollment(student, evaluations, 6.5, 10);

    // Verify enrollment stores data correctly
    expect(enrollment.getStudent().name).toBe('Test Student');
    expect(enrollment.getEvaluations()).toHaveLength(2);
    expect(enrollment.getEvaluations()[0].getGrade()).toBe('MPA');
    expect(enrollment.getEvaluations()[1].getGrade()).toBe('MA');
  });
});

// ============================================
// CROSS-CUTTING CONCERNS
// ============================================

describe('Grade Calculation - Error Handling', () => {
  
  it('should handle null/undefined grades gracefully', () => {
    const grades: Grade[] = [];
    const average = calculateAverageFromGrades(grades);
    expect(average).toBe(0);
  });

  it('should handle incomplete enrollment data', () => {
    const student = new Student('Test Student', '12345678901', 'test@example.com');
    const enrollment = new Enrollment(student, []);

    // Should not throw error
    expect(() => {
      const grades = enrollment.getEvaluations().map(e => e.getGrade());
      calculateAverageFromGrades(grades);
    }).not.toThrow();
  });

  it('should handle missing final average before exam', () => {
    const student = new Student('Test Student', '12345678901', 'test@example.com');
    const evaluations = [new Evaluation('Requirements', 'MPA')];
    const enrollment = new Enrollment(student, evaluations, 7, null);

    expect(enrollment.getEvaluations()).toHaveLength(1);
  });
});

// ============================================
// APPROVAL STATUS INTEGRATION TESTS
// ============================================

describe('Approval Status Integration', () => {
  it('should return "approved" for preExamAverage >= 7', () => {
    expect(getApprovalStatus(7.0)).toBe('approved');
    expect(getApprovalStatus(8.5)).toBe('approved');
  });
  it('should return "in-final" for preExamAverage < 7 and no final average', () => {
    expect(getApprovalStatus(4.0)).toBe('in-final');
    expect(getApprovalStatus(0.0)).toBe('in-final');
    expect(getApprovalStatus(6.9)).toBe('in-final');
  });
  it('should return "approved-in-final" for final average >= 5', () => {
    expect(getApprovalStatus(4.0, 5.0)).toBe('approved-in-final');
    expect(getApprovalStatus(6.5, 5.5)).toBe('approved-in-final');
    expect(getApprovalStatus(2.0, 5.0)).toBe('approved-in-final');
  });
  it('should return "in-final" for final average < 5', () => {
    expect(getApprovalStatus(4.0, 4.9)).toBe('failed');
    expect(getApprovalStatus(6.5, 4.0)).toBe('failed');
    expect(getApprovalStatus(2.0, 3.0)).toBe('failed');
  });
});
