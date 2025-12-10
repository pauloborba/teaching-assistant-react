import request from 'supertest';
import { app, studentSet, classes } from '../server';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import * as fs from 'fs';
import * as path from 'path';

describe('Grade Import API - /api/classes/gradeImport/:classId', () => {
  let testClass: Class;
  const classId = 'Engenharia de Software e Sistemas-2025-1';

  // Setup: Create test class with students and enrollments before each test
  beforeEach(() => {
    // Clear all existing data
    const allStudents = studentSet.getAllStudents();
    allStudents.forEach(student => {
      try {
        studentSet.removeStudent(student.getCPF());
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    const allClasses = classes.getAllClasses();
    allClasses.forEach(classObj => {
      try {
        classes.removeClass(classObj.getClassId());
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    // Create test class
    testClass = new Class('Engenharia de Software e Sistemas', 1, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    classes.addClass(testClass);

    // Create and enroll test students with evaluations
    const studentData = [
      { name: 'Student One', cpf: '11111111111', email: 'student1@test.com' },
      { name: 'Student Two', cpf: '22222222222', email: 'student2@test.com' },
      { name: 'Student Three', cpf: '33333333333', email: 'student3@test.com' },
      { name: 'Student Four', cpf: '55555555555', email: 'student4@test.com' }
    ];

    studentData.forEach(data => {
      const student = new Student(data.name, data.cpf, data.email);
      studentSet.addStudent(student);
      const enrollment = testClass.addEnrollment(student);
      
      // Não adiciona avaliações iniciais para permitir que o CSV importe as notas
      // A lógica do sistema só atualiza se a nota for undefined (não existir)
    });
  });

  describe('Scenario: Upload de arquivo de notas com sucesso', () => {
    test('should return 200 with session_string, file_columns and mapping_columns when uploading a valid CSV file', async () => {
      const filePath = path.resolve(__dirname, './tests_files/import_grade_1.csv');
      
      expect(fs.existsSync(filePath)).toBe(true);

      const response = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .attach('file', filePath)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('session_string');
      expect(response.body).toHaveProperty('file_columns');
      expect(response.body).toHaveProperty('mapping_colums'); // Note: typo in backend

      // Validate types and content
      expect(typeof response.body.session_string).toBe('string');
      expect(response.body.session_string.length).toBeGreaterThan(0);

      expect(Array.isArray(response.body.file_columns)).toBe(true);
      expect(response.body.file_columns.length).toBeGreaterThan(0);
      expect(response.body.file_columns).toContain('cpf');
      
      // mapping_colums should contain the class goals plus 'cpf'
      expect(Array.isArray(response.body.mapping_colums)).toBe(true);
      expect(response.body.mapping_colums.length).toBeGreaterThan(0);
      expect(response.body.mapping_colums).toContain('cpf');
      expect(response.body.mapping_colums).toContain('Requirements');
    });
  });

  describe('Scenario: Upload de arquivo inválido', () => {
    test('should return 400 when uploading a non-CSV/XLSX file', async () => {
      const filePath = path.resolve(__dirname, './tests_files/import_grade_invalid.txt');
      
      expect(fs.existsSync(filePath)).toBe(true);

      const response = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .attach('file', filePath);

      // Backend now validates file type and should return 400
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Invalid file type|CSV|XLSX/i);
    });
  });

  describe('Scenario: Envio de mapeamento de colunas para goals', () => {
    let sessionString: string;
    let fileColumns: string[];
    let mappingColumns: string[];

    beforeEach(async () => {
      // First, upload the file to get session_string
      const filePath = path.resolve(__dirname, './tests_files/import_grade_1.csv');
      const uploadResponse = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .attach('file', filePath)
        .expect(200);

      sessionString = uploadResponse.body.session_string;
      fileColumns = uploadResponse.body.file_columns;
      mappingColumns = uploadResponse.body.mapping_colums; // Note: typo in backend
    });

    test('should parse grades successfully when sending mapping with session_string', async () => {
      // Create mapping: file column -> goal
      // Using identity mapping where column names match goal names
      const mapping: Record<string, string> = {};
      
      fileColumns.forEach(col => {
        if (mappingColumns.includes(col)) {
          mapping[col] = col;
        }
      });

      // Ensure cpf is mapped
      if (fileColumns.includes('cpf') && mappingColumns.includes('cpf')) {
        mapping['cpf'] = 'cpf';
      }

      const response = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .send({
          session_string: sessionString,
          mapping: mapping
        })
        .expect(200);

      // Response should be an array of parsed lines
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate structure of first parsed line
      const firstLine = response.body[0];
      expect(firstLine).toHaveProperty('cpf');
      
      // Check that goals from mapping are present
      mappingColumns.forEach(goal => {
        if (goal !== 'cpf') {
          expect(firstLine).toHaveProperty(goal);
        }
      });

      // Validate specific known data from import_grade_1.csv
      const studentOneLine = response.body.find((line: any) => line.cpf === '11111111111');
      expect(studentOneLine).toBeDefined();
      expect(studentOneLine.Requirements).toBe('MA');
      expect(studentOneLine['Configuration Management']).toBe('MA');
      
      const studentTwoLine = response.body.find((line: any) => line.cpf === '22222222222');
      expect(studentTwoLine).toBeDefined();
      expect(studentTwoLine.Requirements).toBe('MA');
      // All cells have MA in current CSV
      expect(studentTwoLine['Configuration Management']).toBe('MA');
    });

    test('should update enrollments with parsed grades', async () => {
      // Create mapping
      const mapping: Record<string, string> = {};
      fileColumns.forEach(col => {
        if (mappingColumns.includes(col)) {
          mapping[col] = col;
        }
      });

      await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .send({
          session_string: sessionString,
          mapping: mapping
        })
        .expect(200);

      // Verify that the enrollments were updated in the class
      const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');
      expect(enrollment).toBeDefined();
      
      if (enrollment) {
        const reqEval = enrollment.getEvaluations().find(e => e.getGoal() === 'Requirements');
        expect(reqEval).toBeDefined();
        // Should be MA from CSV import (was undefined before)
        expect(reqEval?.getGrade()).toBe('MA');
      }
    });

    test('should return 404 when student CPF is not enrolled in class', async () => {
      // Create a CSV with a non-enrolled student
      const testFilePath = path.resolve(__dirname, './tests_files/import_grade_temp.csv');
      const csvContent = 'cpf,Requirements\n99999999999,MA\n';
      fs.writeFileSync(testFilePath, csvContent);

      try {
        // Upload the file
        const uploadResponse = await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .attach('file', testFilePath)
          .expect(200);

        const tempSessionString = uploadResponse.body.session_string;
        const tempFileColumns = uploadResponse.body.file_columns;

        // Create mapping
        const mapping: Record<string, string> = {};
        tempFileColumns.forEach((col: string) => {
          mapping[col] = col;
        });

        // Send mapping - should fail because CPF is not enrolled
        const response = await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .send({
            session_string: tempSessionString,
            mapping: mapping
          })
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/not enrolled|99999999999/i);
      } finally {
        // Cleanup temporary file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should return 400 when grade value is invalid', async () => {
      // Create a CSV with invalid grade
      const testFilePath = path.resolve(__dirname, './tests_files/import_grade_invalid_grade.csv');
      const csvContent = 'cpf,Requirements\n11111111111,INVALID\n';
      fs.writeFileSync(testFilePath, csvContent);

      try {
        // Upload the file
        const uploadResponse = await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .attach('file', testFilePath)
          .expect(200);

        const tempSessionString = uploadResponse.body.session_string;
        const tempFileColumns = uploadResponse.body.file_columns;

        // Create mapping
        const mapping: Record<string, string> = {};
        tempFileColumns.forEach((col: string) => {
          mapping[col] = col;
        });

        // Send mapping - should fail because grade is invalid
        const response = await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .send({
            session_string: tempSessionString,
            mapping: mapping
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/Invalid grade/i);
      } finally {
        // Cleanup temporary file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('Edge cases', () => {
    test('should return 404 when classId does not exist', async () => {
      const filePath = path.resolve(__dirname, './tests_files/import_grade_1.csv');
      
      const response = await request(app)
        .post('/api/classes/gradeImport/NonExistentClass-2025-1')
        .attach('file', filePath)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Class not Found/i);
    });

    test('should update all grades from CSV without losing data', async () => {
      // import_grade_1.csv has all students with MA grades
      const filePath = path.resolve(__dirname, './tests_files/import_grade_1.csv');
      
      // Upload file
      const uploadResponse = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .attach('file', filePath)
        .expect(200);

      const sessionString = uploadResponse.body.session_string;
      const fileColumns = uploadResponse.body.file_columns;
      const mappingColumns = uploadResponse.body.mapping_colums;

      // Create mapping
      const mapping: Record<string, string> = {};
      fileColumns.forEach((col: string) => {
        if (mappingColumns.includes(col)) {
          mapping[col] = col;
        }
      });

      // Send mapping
      await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .send({
          session_string: sessionString,
          mapping: mapping
        })
        .expect(200);

      // Verify that grades are updated from CSV (no empty cells in current test file)
      const enrollment = testClass.findEnrollmentByStudentCPF('22222222222');
      expect(enrollment).toBeDefined();
      
      if (enrollment) {
        // Student 22222222222 has all grades = MA from CSV import
        const reqEval = enrollment.getEvaluations().find(e => e.getGoal() === 'Requirements');
        expect(reqEval).toBeDefined();
        expect(reqEval?.getGrade()).toBe('MA');

        // Configuration Management should also be MA from CSV
        const configEval = enrollment.getEvaluations().find(e => e.getGoal() === 'Configuration Management');
        expect(configEval).toBeDefined();
        expect(configEval?.getGrade()).toBe('MA');
      }
    });

    test('should NOT overwrite existing grades when importing CSV', async () => {
      // First, add initial grades to students
      const student1 = testClass.findEnrollmentByStudentCPF('11111111111');
      const student2 = testClass.findEnrollmentByStudentCPF('22222222222');
      
      if (student1 && student2) {
        // Set initial grades that differ from CSV
        student1.addOrUpdateEvaluation('Requirements', 'MPA');
        student1.addOrUpdateEvaluation('Design', 'MANA');
        student2.addOrUpdateEvaluation('Configuration Management', 'MPA');
        student2.addOrUpdateEvaluation('Tests', 'MANA');
      }

      // Now import CSV (all values are MA)
      const filePath = path.resolve(__dirname, './tests_files/import_grade_1.csv');
      const uploadResponse = await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .attach('file', filePath)
        .expect(200);

      const sessionString = uploadResponse.body.session_string;
      const fileColumns = uploadResponse.body.file_columns;
      const mappingColumns = uploadResponse.body.mapping_colums;

      const mapping: Record<string, string> = {};
      fileColumns.forEach((col: string) => {
        if (mappingColumns.includes(col)) {
          mapping[col] = col;
        }
      });

      await request(app)
        .post(`/api/classes/gradeImport/${classId}`)
        .send({
          session_string: sessionString,
          mapping: mapping
        })
        .expect(200);

      // Verify that existing grades were NOT overwritten
      const enrollment1 = testClass.findEnrollmentByStudentCPF('11111111111');
      expect(enrollment1).toBeDefined();
      
      if (enrollment1) {
        // Requirements should still be MPA (not overwritten by MA from CSV)
        const reqEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Requirements');
        expect(reqEval).toBeDefined();
        expect(reqEval?.getGrade()).toBe('MPA');

        // Design should still be MANA (not overwritten by MA from CSV)
        const designEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Design');
        expect(designEval).toBeDefined();
        expect(designEval?.getGrade()).toBe('MANA');

        // But other goals that were undefined should be imported as MA
        const pmEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Project Management');
        expect(pmEval).toBeDefined();
        expect(pmEval?.getGrade()).toBe('MA');
      }

      const enrollment2 = testClass.findEnrollmentByStudentCPF('22222222222');
      expect(enrollment2).toBeDefined();
      
      if (enrollment2) {
        // Configuration Management should still be MPA
        const configEval = enrollment2.getEvaluations().find(e => e.getGoal() === 'Configuration Management');
        expect(configEval).toBeDefined();
        expect(configEval?.getGrade()).toBe('MPA');

        // Tests should still be MANA
        const testsEval = enrollment2.getEvaluations().find(e => e.getGoal() === 'Tests');
        expect(testsEval).toBeDefined();
        expect(testsEval?.getGrade()).toBe('MANA');
      }
    });

    test('should handle CSV with empty cells without removing existing grades', async () => {
      // Create a CSV with some empty cells
      const testFilePath = path.resolve(__dirname, './tests_files/import_grade_temp_empty.csv');
      const csvContent = 'cpf,Requirements,Configuration Management,Design\n11111111111,MA,,MPA\n22222222222,,MA,\n';
      fs.writeFileSync(testFilePath, csvContent);

      // Add initial grades to students
      const student1 = testClass.findEnrollmentByStudentCPF('11111111111');
      const student2 = testClass.findEnrollmentByStudentCPF('22222222222');
      
      if (student1 && student2) {
        student1.addOrUpdateEvaluation('Requirements', 'MANA');
        student1.addOrUpdateEvaluation('Configuration Management', 'MANA');
        student1.addOrUpdateEvaluation('Design', 'MANA');
        
        student2.addOrUpdateEvaluation('Requirements', 'MPA');
        student2.addOrUpdateEvaluation('Configuration Management', 'MPA');
        student2.addOrUpdateEvaluation('Design', 'MPA');
      }

      try {
        // Upload and process
        const uploadResponse = await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .attach('file', testFilePath)
          .expect(200);

        const sessionString = uploadResponse.body.session_string;
        const fileColumns = uploadResponse.body.file_columns;
        const mappingColumns = uploadResponse.body.mapping_colums;

        const mapping: Record<string, string> = {};
        fileColumns.forEach((col: string) => {
          if (mappingColumns.includes(col)) {
            mapping[col] = col;
          }
        });

        await request(app)
          .post(`/api/classes/gradeImport/${classId}`)
          .send({
            session_string: sessionString,
            mapping: mapping
          })
          .expect(200);

        // Verify student 1
        const enrollment1 = testClass.findEnrollmentByStudentCPF('11111111111');
        if (enrollment1) {
          // Requirements: MANA (existing) should NOT be overwritten because CSV has MA and grade exists
          const reqEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Requirements');
          expect(reqEval?.getGrade()).toBe('MANA');

          // Configuration Management: empty in CSV, should keep existing MANA
          const configEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Configuration Management');
          expect(configEval?.getGrade()).toBe('MANA');

          // Design: MANA (existing) should NOT be overwritten by MPA from CSV
          const designEval = enrollment1.getEvaluations().find(e => e.getGoal() === 'Design');
          expect(designEval?.getGrade()).toBe('MANA');
        }

        // Verify student 2
        const enrollment2 = testClass.findEnrollmentByStudentCPF('22222222222');
        if (enrollment2) {
          // Requirements: empty in CSV, should keep existing MPA
          const reqEval = enrollment2.getEvaluations().find(e => e.getGoal() === 'Requirements');
          expect(reqEval?.getGrade()).toBe('MPA');

          // Configuration Management: MPA (existing) should NOT be overwritten by MA from CSV
          const configEval = enrollment2.getEvaluations().find(e => e.getGoal() === 'Configuration Management');
          expect(configEval?.getGrade()).toBe('MPA');

          // Design: empty in CSV, should keep existing MPA
          const designEval = enrollment2.getEvaluations().find(e => e.getGoal() === 'Design');
          expect(designEval?.getGrade()).toBe('MPA');
        }
      } finally {
        // Clean up
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });
});
