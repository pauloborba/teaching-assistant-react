import { Enrollment } from '../models/Enrollment';
import { Student } from '../models/Student';
import { Evaluation, Grade } from '../models/Evaluation';

describe('Enrollment - Self-Evaluation Unit Tests', () => {
  let testStudent: Student;
  let enrollment: Enrollment;

  beforeEach(() => {
    testStudent = new Student('João Silva', '123.456.789-01', 'joao@email.com');
    enrollment = new Enrollment(testStudent);
  });

  describe('getSelfEvaluations', () => {
    test('should return empty array for new enrollment', () => {
      const selfEvals = enrollment.getSelfEvaluations();
      
      expect(selfEvals).toEqual([]);
      expect(Array.isArray(selfEvals)).toBe(true);
    });

    test('should return a copy of self-evaluations array', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const selfEvals1 = enrollment.getSelfEvaluations();
      const selfEvals2 = enrollment.getSelfEvaluations();
      
      // Different array instances
      expect(selfEvals1).not.toBe(selfEvals2);
      // But same content
      expect(selfEvals1).toEqual(selfEvals2);
    });

    test('should prevent external modification of internal array', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      selfEvals.push(new Evaluation('Fake Goal', 'MPA'));
      
      // Internal array should not be affected
      expect(enrollment.getSelfEvaluations()).toHaveLength(1);
    });
  });

  describe('addOrUpdateSelfEvaluation', () => {
    test('should add a new self-evaluation', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(1);
      expect(selfEvals[0].getGoal()).toBe('Requirements');
      expect(selfEvals[0].getGrade()).toBe('MA');
    });

    test('should add multiple self-evaluations with different goals', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      enrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(3);
      
      const goals = selfEvals.map(e => e.getGoal());
      expect(goals).toContain('Requirements');
      expect(goals).toContain('Design');
      expect(goals).toContain('Tests');
    });

    test('should update existing self-evaluation for same goal', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MPA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(1);
      expect(selfEvals[0].getGoal()).toBe('Requirements');
      expect(selfEvals[0].getGrade()).toBe('MPA');
    });

    test('should handle all valid grade types', () => {
      const grades: Grade[] = ['MA', 'MPA', 'MANA'];
      
      grades.forEach((grade, index) => {
        enrollment.addOrUpdateSelfEvaluation(`Goal${index}`, grade);
      });
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(3);
      expect(selfEvals[0].getGrade()).toBe('MA');
      expect(selfEvals[1].getGrade()).toBe('MPA');
      expect(selfEvals[2].getGrade()).toBe('MANA');
    });

    test('should maintain order of additions', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      enrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals[0].getGoal()).toBe('Requirements');
      expect(selfEvals[1].getGoal()).toBe('Design');
      expect(selfEvals[2].getGoal()).toBe('Tests');
    });

    test('should preserve other evaluations when updating one', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      enrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      
      // Update middle one
      enrollment.addOrUpdateSelfEvaluation('Design', 'MA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(3);
      expect(selfEvals[0].getGrade()).toBe('MA'); // Requirements unchanged
      expect(selfEvals[1].getGrade()).toBe('MA'); // Design updated
      expect(selfEvals[2].getGrade()).toBe('MANA'); // Tests unchanged
    });
  });

  describe('removeSelfEvaluation', () => {
    test('should remove existing self-evaluation', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      
      const removed = enrollment.removeSelfEvaluation('Requirements');
      
      expect(removed).toBe(true);
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(1);
      expect(selfEvals[0].getGoal()).toBe('Design');
    });

    test('should return false when removing non-existent self-evaluation', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const removed = enrollment.removeSelfEvaluation('NonExistent');
      
      expect(removed).toBe(false);
      expect(enrollment.getSelfEvaluations()).toHaveLength(1);
    });

    test('should handle removing from empty list', () => {
      const removed = enrollment.removeSelfEvaluation('Requirements');
      
      expect(removed).toBe(false);
      expect(enrollment.getSelfEvaluations()).toHaveLength(0);
    });

    test('should remove only the specified self-evaluation', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      enrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      
      enrollment.removeSelfEvaluation('Design');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(2);
      expect(selfEvals.find(e => e.getGoal() === 'Requirements')).toBeDefined();
      expect(selfEvals.find(e => e.getGoal() === 'Tests')).toBeDefined();
      expect(selfEvals.find(e => e.getGoal() === 'Design')).toBeUndefined();
    });

    test('should handle removing last remaining self-evaluation', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const removed = enrollment.removeSelfEvaluation('Requirements');
      
      expect(removed).toBe(true);
      expect(enrollment.getSelfEvaluations()).toHaveLength(0);
    });
  });

  describe('getSelfEvaluationForGoal', () => {
    test('should return self-evaluation for existing goal', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      
      const selfEval = enrollment.getSelfEvaluationForGoal('Requirements');
      
      expect(selfEval).toBeDefined();
      expect(selfEval?.getGoal()).toBe('Requirements');
      expect(selfEval?.getGrade()).toBe('MA');
    });

    test('should return undefined for non-existent goal', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const selfEval = enrollment.getSelfEvaluationForGoal('NonExistent');
      
      expect(selfEval).toBeUndefined();
    });

    test('should return undefined for empty self-evaluations', () => {
      const selfEval = enrollment.getSelfEvaluationForGoal('Requirements');
      
      expect(selfEval).toBeUndefined();
    });

    test('should return updated value after update', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MANA');
      
      const selfEval = enrollment.getSelfEvaluationForGoal('Requirements');
      
      expect(selfEval?.getGrade()).toBe('MANA');
    });
  });

  describe('Independence between evaluations and self-evaluations', () => {
    test('should keep evaluations and self-evaluations separate', () => {
      enrollment.addOrUpdateEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MANA');
      
      expect(enrollment.getEvaluations()).toHaveLength(1);
      expect(enrollment.getSelfEvaluations()).toHaveLength(1);
      
      expect(enrollment.getEvaluationForGoal('Requirements')?.getGrade()).toBe('MA');
      expect(enrollment.getSelfEvaluationForGoal('Requirements')?.getGrade()).toBe('MANA');
    });

    test('should allow different goals in evaluations and self-evaluations', () => {
      enrollment.addOrUpdateEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateEvaluation('Design', 'MPA');
      
      enrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      enrollment.addOrUpdateSelfEvaluation('Refactoring', 'MA');
      
      expect(enrollment.getEvaluations()).toHaveLength(2);
      expect(enrollment.getSelfEvaluations()).toHaveLength(2);
      
      expect(enrollment.getEvaluationForGoal('Tests')).toBeUndefined();
      expect(enrollment.getSelfEvaluationForGoal('Requirements')).toBeUndefined();
    });

    test('should not affect evaluations when modifying self-evaluations', () => {
      enrollment.addOrUpdateEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MPA');
      
      enrollment.removeSelfEvaluation('Requirements');
      
      expect(enrollment.getEvaluations()).toHaveLength(1);
      expect(enrollment.getEvaluationForGoal('Requirements')?.getGrade()).toBe('MA');
      expect(enrollment.getSelfEvaluations()).toHaveLength(0);
    });

    test('should not affect self-evaluations when modifying evaluations', () => {
      enrollment.addOrUpdateEvaluation('Design', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MANA');
      
      enrollment.removeEvaluation('Design');
      
      expect(enrollment.getSelfEvaluations()).toHaveLength(1);
      expect(enrollment.getSelfEvaluationForGoal('Design')?.getGrade()).toBe('MANA');
      expect(enrollment.getEvaluations()).toHaveLength(0);
    });
  });

  describe('mergeSelfEvaluationsFrom', () => {
    test('should merge self-evaluations from another enrollment', () => {
      const otherStudent = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const otherEnrollment = new Enrollment(otherStudent);
      
      otherEnrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      otherEnrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      
      enrollment.mergeSelfEvaluationsFrom(otherEnrollment);
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(2);
      expect(selfEvals.find(e => e.getGoal() === 'Requirements')).toBeDefined();
      expect(selfEvals.find(e => e.getGoal() === 'Design')).toBeDefined();
    });

    test('should update existing self-evaluations when merging', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MANA');
      
      const otherStudent = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const otherEnrollment = new Enrollment(otherStudent);
      otherEnrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      enrollment.mergeSelfEvaluationsFrom(otherEnrollment);
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(1);
      expect(selfEvals[0].getGrade()).toBe('MA');
    });

    test('should add new goals and preserve existing ones when merging', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      
      const otherStudent = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const otherEnrollment = new Enrollment(otherStudent);
      otherEnrollment.addOrUpdateSelfEvaluation('Tests', 'MANA');
      otherEnrollment.addOrUpdateSelfEvaluation('Design', 'MA'); // Update existing
      
      enrollment.mergeSelfEvaluationsFrom(otherEnrollment);
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(3);
      expect(selfEvals.find(e => e.getGoal() === 'Requirements')?.getGrade()).toBe('MA');
      expect(selfEvals.find(e => e.getGoal() === 'Design')?.getGrade()).toBe('MA');
      expect(selfEvals.find(e => e.getGoal() === 'Tests')?.getGrade()).toBe('MANA');
    });

    test('should handle merging from enrollment with no self-evaluations', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      
      const otherStudent = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const otherEnrollment = new Enrollment(otherStudent);
      
      enrollment.mergeSelfEvaluationsFrom(otherEnrollment);
      
      expect(enrollment.getSelfEvaluations()).toHaveLength(1);
    });

    test('should not affect regular evaluations when merging self-evaluations', () => {
      enrollment.addOrUpdateEvaluation('Requirements', 'MA');
      
      const otherStudent = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const otherEnrollment = new Enrollment(otherStudent);
      otherEnrollment.addOrUpdateSelfEvaluation('Design', 'MPA');
      
      enrollment.mergeSelfEvaluationsFrom(otherEnrollment);
      
      expect(enrollment.getEvaluations()).toHaveLength(1);
      expect(enrollment.getEvaluationForGoal('Requirements')?.getGrade()).toBe('MA');
    });
  });

  describe('Constructor with self-evaluations', () => {
    test('should create enrollment with initial self-evaluations', () => {
      const selfEvals = [
        new Evaluation('Requirements', 'MA'),
        new Evaluation('Design', 'MPA')
      ];
      
      const enrollmentWithSelfEvals = new Enrollment(testStudent, [], selfEvals);
      
      expect(enrollmentWithSelfEvals.getSelfEvaluations()).toHaveLength(2);
      expect(enrollmentWithSelfEvals.getSelfEvaluationForGoal('Requirements')?.getGrade()).toBe('MA');
      expect(enrollmentWithSelfEvals.getSelfEvaluationForGoal('Design')?.getGrade()).toBe('MPA');
    });

    test('should keep evaluations and self-evaluations separate in constructor', () => {
      const evals = [new Evaluation('Requirements', 'MA')];
      const selfEvals = [new Evaluation('Design', 'MPA')];
      
      const enrollmentWithBoth = new Enrollment(testStudent, evals, selfEvals);
      
      expect(enrollmentWithBoth.getEvaluations()).toHaveLength(1);
      expect(enrollmentWithBoth.getSelfEvaluations()).toHaveLength(1);
      expect(enrollmentWithBoth.getEvaluationForGoal('Requirements')).toBeDefined();
      expect(enrollmentWithBoth.getSelfEvaluationForGoal('Design')).toBeDefined();
    });
  });

  describe('Edge cases and data integrity', () => {
    test('should handle goal names with special characters', () => {
      enrollment.addOrUpdateSelfEvaluation('Goal with spaces', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Goal-with-hyphens', 'MPA');
      
      expect(enrollment.getSelfEvaluations()).toHaveLength(2);
      expect(enrollment.getSelfEvaluationForGoal('Goal with spaces')).toBeDefined();
      expect(enrollment.getSelfEvaluationForGoal('Goal-with-hyphens')).toBeDefined();
    });

    test('should handle case-sensitive goal names', () => {
      enrollment.addOrUpdateSelfEvaluation('Requirements', 'MA');
      enrollment.addOrUpdateSelfEvaluation('requirements', 'MPA');
      
      // Should treat as different goals
      expect(enrollment.getSelfEvaluations()).toHaveLength(2);
    });

    test('should maintain data integrity after multiple operations', () => {
      // Add multiple
      enrollment.addOrUpdateSelfEvaluation('Goal1', 'MA');
      enrollment.addOrUpdateSelfEvaluation('Goal2', 'MPA');
      enrollment.addOrUpdateSelfEvaluation('Goal3', 'MANA');
      
      // Update one
      enrollment.addOrUpdateSelfEvaluation('Goal2', 'MA');
      
      // Remove one
      enrollment.removeSelfEvaluation('Goal1');
      
      // Add new
      enrollment.addOrUpdateSelfEvaluation('Goal4', 'MPA');
      
      const selfEvals = enrollment.getSelfEvaluations();
      expect(selfEvals).toHaveLength(3);
      expect(selfEvals.find(e => e.getGoal() === 'Goal1')).toBeUndefined();
      expect(selfEvals.find(e => e.getGoal() === 'Goal2')?.getGrade()).toBe('MA');
      expect(selfEvals.find(e => e.getGoal() === 'Goal3')?.getGrade()).toBe('MANA');
      expect(selfEvals.find(e => e.getGoal() === 'Goal4')?.getGrade()).toBe('MPA');
    });
  });
});
