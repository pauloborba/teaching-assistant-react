import request from 'supertest';
import { app, studentSet, classes } from '../server';

describe('Server API - Student Endpoints', () => {
  // Clean up data before each test to ensure isolation
  beforeEach(() => {
    // Clear all students and classes for clean test state
    const allStudents = studentSet.getAllStudents();
    allStudents.forEach(student => {
      try {
        studentSet.removeStudent(student.getCPF());
      } catch (error) {
        // Student might not exist, which is fine for cleanup
      }
    });

    const allClasses = classes.getAllClasses();
    allClasses.forEach(classObj => {
      try {
        classes.removeClass(classObj.getClassId());
      } catch (error) {
        // Class might not exist, which is fine for cleanup
      }
    });
  });

  describe('POST /api/students - Student Creation', () => {
    describe('Valid student data', () => {
      test('should accept various valid CPF formats', async () => {
        const validCPFFormats = [
          { cpf: '12345678901', expected: '123.456.789-01' },      // Clean format
          { cpf: '123.456.789-02', expected: '123.456.789-02' },   // Formatted with dots/hyphens
          { cpf: '123456789-03', expected: '123.456.789-03' },     // Partial formatting
          { cpf: '123.456.78904', expected: '123.456.789-04' },    // Mixed formatting
          { cpf: '123-456-789-05', expected: '123.456.789-05' }    // All hyphens (gets cleaned)
        ];

        for (const { cpf, expected } of validCPFFormats) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: `Test User ${cpf}`,
              cpf: cpf,
              email: `test${cpf.replace(/\D/g, '')}@email.com` // Unique email
            });
          
          if (response.status !== 201) {
            console.log(`Failed for CPF: ${cpf}, Response:`, response.body);
          }
          expect(response.status).toBe(201);
          expect(response.body.cpf).toBe(expected);
        }
      });
      test('should create student with valid data (formatted CPF)', async () => {
        const studentData = {
          name: 'João Silva',
          cpf: '123.456.789-01',
          email: 'joao@email.com'
        };

        const response = await request(app)
          .post('/api/students')
          .send(studentData)
          .expect(201);

        expect(response.body).toEqual({
          name: 'João Silva',
          cpf: '123.456.789-01',
          email: 'joao@email.com'
        });
      });

      test('should create student with valid data (clean CPF)', async () => {
        const studentData = {
          name: 'Maria Santos',
          cpf: '98765432100',
          email: 'maria@email.com'
        };

        const response = await request(app)
          .post('/api/students')
          .send(studentData)
          .expect(201);

        expect(response.body).toEqual({
          name: 'Maria Santos',
          cpf: '987.654.321-00',  // Should be formatted in response
          email: 'maria@email.com'
        });
      });

      test('should accept email with dots before @', async () => {
        const studentData = {
          name: 'Pedro Borba',
          cpf: '11122233344',
          email: 'p.b@ufpe.br'
        };

        const response = await request(app)
          .post('/api/students')
          .send(studentData)
          .expect(201);

        expect(response.body.email).toBe('p.b@ufpe.br');
      });

      test('should accept various valid email formats', async () => {
        const validEmailCases = [
          { name: 'User One', cpf: '11111111111', email: 'user@domain.com' },
          { name: 'User Two', cpf: '22222222222', email: 'first.last@company.org' },
          { name: 'User Three', cpf: '33333333333', email: 'user+tag@domain.co.uk' },
          { name: 'User Four', cpf: '44444444444', email: 'test123@sub.domain.com' }
        ];

        for (const studentData of validEmailCases) {
          const response = await request(app)
            .post('/api/students')
            .send(studentData)
            .expect(201);

          expect(response.body.email).toBe(studentData.email);
        }
      });
    });

    describe('Invalid CPF validation', () => {
      test('should reject CPF with insufficient digits', async () => {
        const invalidCPFCases = [
          '123456789',      // 9 digits
          '12345678',       // 8 digits
          '123.456.789',    // 9 digits formatted
          '1234567'         // 7 digits
        ];

        for (const cpf of invalidCPFCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: cpf,
              email: 'test@email.com'
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid CPF format');
        }
      });

      test('should reject CPF with excessive digits', async () => {
        const invalidCPFCases = [
          '123456789012',     // 12 digits
          '123.456.789-012',  // 12 digits formatted
          '12345678901234',   // 14 digits
        ];

        for (const cpf of invalidCPFCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: cpf,
              email: 'test@email.com'
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid CPF format');
        }
      });

      test('should reject CPF with non-numeric characters', async () => {
        const invalidCPFCases = [
          '1234567890a',      // Letter at end
          'abcdefghijk',      // All letters
          '123.456.abc-01',   // Letters in middle
          '123 456 789 01',   // Spaces instead of formatting
          '123/456/789/01'    // Wrong separators (/ not cleaned)
          // Note: '123-456-789-01' is valid because hyphens get cleaned by cleanCPF
        ];

        for (const cpf of invalidCPFCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: cpf,
              email: 'test@email.com'
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid CPF format');
        }
      });

      test('should reject empty or whitespace-only CPF', async () => {
        const invalidCPFCases = [
          '',         // Empty string
          '   ',      // Whitespace only
          '\t',       // Tab
          '\n'        // Newline
        ];

        for (const cpf of invalidCPFCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: cpf,
              email: 'test@email.com'
            })
            .expect(400);

          // Empty CPF will be caught by required fields validation first
          expect(response.body.error).toMatch(/required|Invalid CPF format/);
        }
      });
    });

    describe('Invalid email validation', () => {
      test('should reject emails missing essential components', async () => {
        const invalidEmailCases = [
          'invalid-email',      // No @ or domain
          '@domain.com',        // No local part
          'user@',              // No domain
          'user@domain'         // No TLD
          // Note: Empty string/whitespace will be caught by required fields check
        ];

        for (const email of invalidEmailCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: '12345678901',
              email: email
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid email format');
        }
      });

      test('should reject empty or whitespace-only email', async () => {
        const invalidEmailCases = [
          '',     // Empty string
          '   '   // Whitespace only
        ];

        for (const email of invalidEmailCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: '12345678901',
              email: email
            })
            .expect(400);

          // Whitespace email might be validated as invalid format, empty as required field
          expect(response.body.error).toMatch(/required|Invalid email format/);
        }
      });

      test('should reject emails with spaces', async () => {
        const invalidEmailCases = [
          'user space@domain.com',   // Space in local part
          'user@domain .com',        // Space in domain
          ' user@domain.com',        // Leading space
          'user@domain.com '         // Trailing space
        ];

        for (const email of invalidEmailCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: '12345678901',
              email: email
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid email format');
        }
      });

      test('should reject emails with invalid @ usage', async () => {
        const invalidEmailCases = [
          'user@@domain.com',      // Double @
          'user@',                 // @ at end
          '@user@domain.com',      // @ at start
          'us@er@domain.com'       // Multiple @
        ];

        for (const email of invalidEmailCases) {
          const response = await request(app)
            .post('/api/students')
            .send({
              name: 'Test User',
              cpf: '12345678901',
              email: email
            })
            .expect(400);

          expect(response.body.error).toBe('Invalid email format');
        }
      });
    });

    describe('Missing required fields', () => {
      test('should reject request missing name', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({
            cpf: '12345678901',
            email: 'test@email.com'
          })
          .expect(400);

        expect(response.body.error).toBe('Name, CPF, and email are required');
      });

      test('should reject request missing CPF', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({
            name: 'Test User',
            email: 'test@email.com'
          })
          .expect(400);

        expect(response.body.error).toBe('Name, CPF, and email are required');
      });

      test('should reject request missing email', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({
            name: 'Test User',
            cpf: '12345678901'
          })
          .expect(400);

        expect(response.body.error).toBe('Name, CPF, and email are required');
      });

      test('should reject completely empty request body', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Name, CPF, and email are required');
      });
    });

    describe('Duplicate student handling', () => {
      test('should prevent creating student with duplicate CPF', async () => {
        const studentData = {
          name: 'First Student',
          cpf: '12345678901',
          email: 'first@email.com'
        };

        // Create first student successfully
        await request(app)
          .post('/api/students')
          .send(studentData)
          .expect(201);

        // Attempt to create second student with same CPF should fail
        const duplicateData = {
          name: 'Second Student',
          cpf: '12345678901',  // Same CPF
          email: 'second@email.com'
        };

        const response = await request(app)
          .post('/api/students')
          .send(duplicateData)
          .expect(400);

        expect(response.body.error).toBe('Student with this CPF already exists');
      });
    });
  });

  describe('PUT /api/students/:cpf - Student Update', () => {
    test('should update existing student with valid data', async () => {
      // First create a student
      await request(app)
        .post('/api/students')
        .send({
          name: 'Original Name',
          cpf: '12345678901',
          email: 'original@email.com'
        })
        .expect(201);

      // Then update the student
      const response = await request(app)
        .put('/api/students/12345678901')
        .send({
          name: 'Updated Name',
          email: 'updated@email.com'
        })
        .expect(200);

      expect(response.body).toEqual({
        name: 'Updated Name',
        cpf: '123.456.789-01',
        email: 'updated@email.com'
      });
    });

    test('should reject update with invalid email', async () => {
      // First create a student
      await request(app)
        .post('/api/students')
        .send({
          name: 'Test Student',
          cpf: '12345678901',
          email: 'test@email.com'
        })
        .expect(201);

      // Attempt to update with invalid email
      const response = await request(app)
        .put('/api/students/12345678901')
        .send({
          name: 'Updated Name',
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    test('should reject update missing required fields', async () => {
      const response = await request(app)
        .put('/api/students/12345678901')
        .send({
          name: 'Updated Name'
          // Missing email
        })
        .expect(400);

      expect(response.body.error).toBe('Name and email are required for update');
    });
  });

  describe('Content-Type validation', () => {
    test('should handle JSON content properly', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          name: 'JSON Test',
          cpf: '12345678901',
          email: 'json@test.com'
        }))
        .expect(201);

      expect(response.body.name).toBe('JSON Test');
    });

    test('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/students')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express will handle malformed JSON before our handler
    });
  });
});