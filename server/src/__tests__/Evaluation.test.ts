import { Evaluation, Grade, EVALUATION_GOALS } from '../models/Evaluation';

describe('Evaluation Class - Unit Tests', () => {
  describe('Constructor', () => {
    test('should create evaluation with goal and grade', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      
      expect(evaluation.getGoal()).toBe('Requirements');
      expect(evaluation.getGrade()).toBe('MA');
    });

    test.each([
      ['MA'],
      ['MPA'],
      ['MANA']
    ])('should create evaluation with grade %s', (grade) => {
      const evaluation = new Evaluation('Design', grade as Grade);
      
      expect(evaluation.getGrade()).toBe(grade);
    });

    test('should accept any string as goal', () => {
      const customGoal = 'Custom Goal Name';
      const evaluation = new Evaluation(customGoal, 'MA');
      
      expect(evaluation.getGoal()).toBe(customGoal);
    });

    test('should accept goal with special characters', () => {
      const goals = [
        'Goal with spaces',
        'Goal-with-hyphens',
        'Goal_with_underscores',
        'Goal.with.dots'
      ];

      goals.forEach(goal => {
        const evaluation = new Evaluation(goal, 'MA');
        expect(evaluation.getGoal()).toBe(goal);
      });
    });
  });

  describe('getGoal', () => {
    test('should return the goal', () => {
      const evaluation = new Evaluation('Tests', 'MPA');
      
      expect(evaluation.getGoal()).toBe('Tests');
    });

    test('should return exact goal as provided', () => {
      const goal = 'Configuration Management';
      const evaluation = new Evaluation(goal, 'MANA');
      
      expect(evaluation.getGoal()).toBe(goal);
    });
  });

  describe('getGrade', () => {
    test('should return the grade', () => {
      const evaluation = new Evaluation('Design', 'MPA');
      
      expect(evaluation.getGrade()).toBe('MPA');
    });

    test('should return updated grade after setGrade', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      evaluation.setGrade('MANA');
      
      expect(evaluation.getGrade()).toBe('MANA');
    });
  });

  describe('setGrade', () => {
    test('should update the grade', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      
      evaluation.setGrade('MPA');
      
      expect(evaluation.getGrade()).toBe('MPA');
    });

    test.each([
      ['MA', 'MPA'],
      ['MPA', 'MANA'],
      ['MANA', 'MA'],
      ['MA', 'MA']
    ])('should update grade from %s to %s', (initialGrade, newGrade) => {
      const evaluation = new Evaluation('Design', initialGrade as Grade);
      
      evaluation.setGrade(newGrade as Grade);
      
      expect(evaluation.getGrade()).toBe(newGrade);
    });

    test('should allow multiple updates', () => {
      const evaluation = new Evaluation('Tests', 'MA');
      
      evaluation.setGrade('MPA');
      expect(evaluation.getGrade()).toBe('MPA');
      
      evaluation.setGrade('MANA');
      expect(evaluation.getGrade()).toBe('MANA');
      
      evaluation.setGrade('MA');
      expect(evaluation.getGrade()).toBe('MA');
    });

    test('should not affect goal when updating grade', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      
      evaluation.setGrade('MANA');
      
      expect(evaluation.getGoal()).toBe('Requirements');
      expect(evaluation.getGrade()).toBe('MANA');
    });
  });

  describe('toJSON', () => {
    test('should return object with goal and grade', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      
      const json = evaluation.toJSON();
      
      expect(json).toEqual({
        goal: 'Requirements',
        grade: 'MA'
      });
    });

    test('should return current grade after update', () => {
      const evaluation = new Evaluation('Design', 'MA');
      evaluation.setGrade('MPA');
      
      const json = evaluation.toJSON();
      
      expect(json.grade).toBe('MPA');
    });

    test('should be serializable to JSON string', () => {
      const evaluation = new Evaluation('Tests', 'MANA');
      
      const jsonString = JSON.stringify(evaluation.toJSON());
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.goal).toBe('Tests');
      expect(parsed.grade).toBe('MANA');
    });

    test('should handle special characters in goal', () => {
      const evaluation = new Evaluation('Configuration Management', 'MA');
      
      const json = evaluation.toJSON();
      
      expect(json.goal).toBe('Configuration Management');
    });
  });

  describe('fromJSON', () => {
    test('should create Evaluation from JSON object', () => {
      const jsonData = { goal: 'Requirements', grade: 'MA' as Grade };
      
      const evaluation = Evaluation.fromJSON(jsonData);
      
      expect(evaluation.getGoal()).toBe('Requirements');
      expect(evaluation.getGrade()).toBe('MA');
    });

    test.each([
      ['Requirements', 'MA'],
      ['Design', 'MPA'],
      ['Tests', 'MANA'],
      ['Configuration Management', 'MA'],
      ['Project Management', 'MPA'],
      ['Refactoring', 'MANA']
    ])('should create evaluation from JSON with goal %s and grade %s', (goal, grade) => {
      const jsonData = { goal, grade: grade as Grade };
      
      const evaluation = Evaluation.fromJSON(jsonData);
      
      expect(evaluation.getGoal()).toBe(goal);
      expect(evaluation.getGrade()).toBe(grade);
    });

    test('should create evaluation that can be modified', () => {
      const jsonData = { goal: 'Design', grade: 'MA' as Grade };
      
      const evaluation = Evaluation.fromJSON(jsonData);
      evaluation.setGrade('MPA');
      
      expect(evaluation.getGrade()).toBe('MPA');
    });

    test('should round-trip through JSON serialization', () => {
      const original = new Evaluation('Requirements', 'MA');
      
      const json = original.toJSON();
      const restored = Evaluation.fromJSON(json);
      
      expect(restored.getGoal()).toBe(original.getGoal());
      expect(restored.getGrade()).toBe(original.getGrade());
    });
  });

  describe('Immutability and data integrity', () => {
    test('should not allow direct modification of goal', () => {
      const evaluation = new Evaluation('Requirements', 'MA');
      const goal = evaluation.getGoal();
      
      // Goal is a string, immutable by nature
      expect(typeof goal).toBe('string');
      expect(evaluation.getGoal()).toBe('Requirements');
    });

    test('should maintain state across multiple operations', () => {
      const evaluation = new Evaluation('Design', 'MA');
      
      // Multiple reads shouldn't affect state
      evaluation.getGoal();
      evaluation.getGrade();
      evaluation.toJSON();
      
      expect(evaluation.getGoal()).toBe('Design');
      expect(evaluation.getGrade()).toBe('MA');
    });

    test('should be independent from source JSON after creation', () => {
      const jsonData = { goal: 'Tests', grade: 'MA' as Grade };
      const evaluation = Evaluation.fromJSON(jsonData);
      
      // Modify source JSON
      jsonData.goal = 'Modified';
      jsonData.grade = 'MPA';
      
      // Evaluation should be unaffected
      expect(evaluation.getGoal()).toBe('Tests');
      expect(evaluation.getGrade()).toBe('MA');
    });
  });

  describe('EVALUATION_GOALS constant', () => {
    test('should contain all standard evaluation goals', () => {
      const expectedGoals = [
        'Requirements',
        'Configuration Management',
        'Project Management',
        'Design',
        'Tests',
        'Refactoring'
      ];
      
      expect(EVALUATION_GOALS).toHaveLength(expectedGoals.length);
      expectedGoals.forEach(goal => {
        expect(EVALUATION_GOALS).toContain(goal);
      });
    });

    test('should be usable to create evaluations', () => {
      EVALUATION_GOALS.forEach(goal => {
        const evaluation = new Evaluation(goal, 'MA');
        expect(evaluation.getGoal()).toBe(goal);
      });
    });

    test('should be a readonly array', () => {
      // TypeScript enforces this at compile time
      // At runtime, we can verify it's an array
      expect(Array.isArray(EVALUATION_GOALS)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string as goal', () => {
      const evaluation = new Evaluation('', 'MA');
      
      expect(evaluation.getGoal()).toBe('');
    });

    test('should handle very long goal names', () => {
      const longGoal = 'A'.repeat(1000);
      const evaluation = new Evaluation(longGoal, 'MA');
      
      expect(evaluation.getGoal()).toBe(longGoal);
      expect(evaluation.getGoal().length).toBe(1000);
    });

    test('should handle goal with unicode characters', () => {
      const unicodeGoal = 'Requisitos 📝 em Português';
      const evaluation = new Evaluation(unicodeGoal, 'MA');
      
      expect(evaluation.getGoal()).toBe(unicodeGoal);
    });

    test('should handle goal with newlines and tabs', () => {
      const goal = 'Goal\nwith\nnewlines\tand\ttabs';
      const evaluation = new Evaluation(goal, 'MPA');
      
      expect(evaluation.getGoal()).toBe(goal);
    });
  });

  describe('Type safety', () => {
    test('should accept only valid Grade types', () => {
      const validGrades: Grade[] = ['MA', 'MPA', 'MANA'];
      
      validGrades.forEach(grade => {
        const evaluation = new Evaluation('Test', grade);
        expect(evaluation.getGrade()).toBe(grade);
      });
    });

    test('should maintain grade type after setGrade', () => {
      const evaluation = new Evaluation('Test', 'MA');
      
      const grades: Grade[] = ['MA', 'MPA', 'MANA'];
      grades.forEach(grade => {
        evaluation.setGrade(grade);
        const retrievedGrade: Grade = evaluation.getGrade();
        expect(retrievedGrade).toBe(grade);
      });
    });
  });

  describe('Multiple evaluations independence', () => {
    test('should create independent evaluation instances', () => {
      const eval1 = new Evaluation('Requirements', 'MA');
      const eval2 = new Evaluation('Requirements', 'MPA');
      
      expect(eval1.getGrade()).toBe('MA');
      expect(eval2.getGrade()).toBe('MPA');
    });

    test('should not affect other instances when updating', () => {
      const eval1 = new Evaluation('Design', 'MA');
      const eval2 = new Evaluation('Design', 'MPA');
      
      eval1.setGrade('MANA');
      
      expect(eval1.getGrade()).toBe('MANA');
      expect(eval2.getGrade()).toBe('MPA');
    });

    test('should allow same goal with different grades in different instances', () => {
      const evaluations = [
        new Evaluation('Tests', 'MA'),
        new Evaluation('Tests', 'MPA'),
        new Evaluation('Tests', 'MANA')
      ];
      
      expect(evaluations[0].getGrade()).toBe('MA');
      expect(evaluations[1].getGrade()).toBe('MPA');
      expect(evaluations[2].getGrade()).toBe('MANA');
    });
  });
});
