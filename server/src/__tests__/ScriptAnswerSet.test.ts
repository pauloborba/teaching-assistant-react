import { ScriptAnswerSet } from '../models/ScriptAnswerSet';
import { ScriptAnswer } from '../models/ScriptAnswer';
import { TaskAnswer } from '../models/TaskAnswer';

describe('ScriptAnswerSet', () => {
  let set: ScriptAnswerSet;

  beforeEach(() => {
    set = new ScriptAnswerSet();
  });

  // -----------------------------------------
  // addScriptAnswer
  // -----------------------------------------
  describe('addScriptAnswer', () => {
    test('should add a new ScriptAnswer with explicit ID', () => {
      const data = {
        id: 'A1',
        scriptId: 'S1',
        studentId: 'ST1',
        taskAnswers: [],
        grade: 'MA'
      };

      const result = set.addScriptAnswer(data);

      expect(result.getId()).toBe('A1');
      expect(result.getScriptId()).toBe('S1');
      expect(result.answers.length).toBe(0);
      expect(result.grade).toBe('MA');
      expect(set.getAll().length).toBe(1);
    });

    test('should generate an ID if not provided', () => {
      const data = {
        scriptId: 'S1',
        studentId: 'ST1'
      };

      const result = set.addScriptAnswer(data);

      expect(result.getId()).toBeDefined();
      expect(typeof result.getId()).toBe('string');
      expect(set.getAll().length).toBe(1);
    });
  });

  // -----------------------------------------
  // removeScriptAnswer
  // -----------------------------------------
  describe('removeScriptAnswer', () => {
    test('should remove existing script answer and return true', () => {
      const a = set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });
      expect(set.getAll().length).toBe(1);
    
      const removed = set.removeScriptAnswer(a.getId());

      expect(removed).toBe(true);
      expect(set.getAll().length).toBe(0);
    });

    test('should return false when answer does not exist', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });

      const removed = set.removeScriptAnswer('INVALID');

      expect(removed).toBe(false);
      expect(set.getAll().length).toBe(1);
    });
  });

  // -----------------------------------------
  // removeAllScriptAnswers
  // -----------------------------------------
  describe('removeAllScriptAnswers', () => {
    test('should remove all script answers and return the count', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });
      set.addScriptAnswer({ id: 'A2', scriptId: 'S2', studentId: 'ST2' });
      set.addScriptAnswer({ id: 'A3', scriptId: 'S3', studentId: 'ST3' });
      expect(set.getAll().length).toBe(3);

      const count = set.removeAllScriptAnswers();

      expect(count).toBe(3);
      expect(set.getAll().length).toBe(0);
    });

    test('should return 0 when there are no answers to remove', () => {
      expect(set.getAll().length).toBe(0);

      const count = set.removeAllScriptAnswers();

      expect(count).toBe(0);
      expect(set.getAll().length).toBe(0);
    });

    test('should clear all answers regardless of their properties', () => {
      set.addScriptAnswer({ 
        id: 'A1', 
        scriptId: 'S1', 
        studentId: 'ST1', 
        grade: 'MA',
        taskAnswers: [
          { id: 'TA1', task: 'T1', grade: 'MPA', comments: 'comment' }
        ]
      });
      set.addScriptAnswer({ 
        id: 'A2', 
        scriptId: 'S2', 
        studentId: 'ST2', 
        grade: 'MANA'
      });
      expect(set.getAll().length).toBe(2);

      const count = set.removeAllScriptAnswers();

      expect(count).toBe(2);
      expect(set.getAll()).toEqual([]);
    });
  });

  // -----------------------------------------
  // getAll
  // -----------------------------------------
  describe('getAll', () => {
    test('should return all stored script answers', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });
      set.addScriptAnswer({ id: 'A2', scriptId: 'S2', studentId: 'ST2' });

      const all = set.getAll();

      expect(all.length).toBe(2);
      expect(all.map(a => a.getId())).toEqual(['A1', 'A2']);
    });
  });

  // -----------------------------------------
  // findByStudentId
  // -----------------------------------------
  describe('findByStudentId', () => {
    test('should return all answers for a specific student', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });
      set.addScriptAnswer({ id: 'A2', scriptId: 'S2', studentId: 'ST1' });
      set.addScriptAnswer({ id: 'A3', scriptId: 'S3', studentId: 'ST2' });

      const results = set.findByStudentId('ST1');

      expect(results.length).toBe(2);
      expect(results.map(a => a.getId())).toEqual(['A1', 'A2']);
    });

    test('should return an empty array if student has no answers', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });

      const results = set.findByStudentId('NOPE');

      expect(results).toEqual([]);
    });
  });

  // -----------------------------------------
  // findById
  // -----------------------------------------
  describe('findById', () => {
    test('should return the correct answer by ID', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });

      const result = set.findById('A1');

      expect(result).not.toBeNull();
      expect(result?.getScriptId()).toBe('S1');
    });

    test('should return null for nonexistent ID', () => {
      const result = set.findById('INVALID');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------
  // updateGrade
  // -----------------------------------------
  describe('updateGrade', () => {
    test('should update grade of an existing script answer', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1', grade: undefined });

      const updated = set.updateGrade('A1', 'MA');

      expect(updated).not.toBeNull();
      expect(updated?.grade).toBe('MA');
    });

    test('should return null when updating a nonexistent answer', () => {
      const updated = set.updateGrade('NOPE', 'MA');

      expect(updated).toBeNull();
    });
  });

  // -----------------------------------------
  // updateTaskAnswer
  // -----------------------------------------
  describe('updateTaskAnswer', () => {
    test('should update grade and comments of a task answer', () => {
      const scriptAnswer = set.addScriptAnswer({
        id: 'A1',
        scriptId: 'S1',
        studentId: 'ST1',
        taskAnswers: [
          { id: 'TA1', task: 'T1', grade: 'MA', comments: 'old comment' }
        ]
      });

      const result = set.updateTaskAnswer('TA1', {
        grade: 'MANA',
        comments: 'new comment'
      });

      expect(result).not.toBeNull();
      expect(result?.getGrade()).toBe('MANA');
      expect(result?.comments).toBe('new comment');
    });

    test('should return null when taskAnswerId does not exist', () => {
      set.addScriptAnswer({
        id: 'A1',
        scriptId: 'S1',
        studentId: 'ST1',
        taskAnswers: []
      });

      const result = set.updateTaskAnswer('INVALID', { grade: 'MA' });

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------
  // findByScriptId
  // -----------------------------------------
  describe('findByScriptId', () => {
    test('should return all answers for a specific script', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });
      set.addScriptAnswer({ id: 'A2', scriptId: 'S1', studentId: 'ST2' });
      set.addScriptAnswer({ id: 'A3', scriptId: 'S2', studentId: 'ST3' });

      const results = set.findbyScriptId('S1');

      expect(results.length).toBe(2);
      expect(results.map(a => a.getId())).toEqual(['A1', 'A2']);
    });

    test('should return an empty array if script has no answers', () => {
      set.addScriptAnswer({ id: 'A1', scriptId: 'S1', studentId: 'ST1' });

      const results = set.findbyScriptId('NOPE');

      expect(results).toEqual([]);
    });
  });
});
