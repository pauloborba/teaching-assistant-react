import { Student } from '../models/Student';

describe('Student Class', () => {
  describe('Constructor and Basic Functionality', () => {
    test('should create a student with valid data', () => {
      const student = new Student('João Silva', '123.456.789-01', 'joao@email.com');
      
      expect(student.name).toBe('João Silva');
      expect(student.getCPF()).toBe('12345678901'); // Should store clean CPF
      expect(student.email).toBe('joao@email.com');
    });

    test('should clean and store CPF without formatting', () => {
      const student = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      
      expect(student.getCPF()).toBe('98765432100'); // Clean CPF stored
      expect(student.getFormattedCPF()).toBe('987.654.321-00'); // Formatted for display
    });

    test('should accept CPF with different formatting styles', () => {
      const student1 = new Student('Test User', '123.456.789-01', 'test@email.com');
      const student2 = new Student('Test User', '123456789-01', 'test@email.com');
      const student3 = new Student('Test User', '123.456.78901', 'test@email.com');
      const student4 = new Student('Test User', '12345678901', 'test@email.com');
      
      // All should result in the same clean CPF
      expect(student1.getCPF()).toBe('12345678901');
      expect(student2.getCPF()).toBe('12345678901');
      expect(student3.getCPF()).toBe('12345678901');
      expect(student4.getCPF()).toBe('12345678901');
    });
  });

  describe('validateCPF method', () => {
    test('should accept valid CPF with 11 digits', () => {
      // These should not throw errors
      expect(() => new Student('Valid User', '12345678901', 'valid@email.com')).not.toThrow();
      expect(() => new Student('Valid User', '111.222.333-44', 'valid@email.com')).not.toThrow();
      expect(() => new Student('Valid User', '000.000.000-00', 'valid@email.com')).not.toThrow();
    });

    test('should reject CPF with less than 11 digits', () => {
      expect(() => new Student('Invalid User', '123456789', 'test@email.com'))
        .toThrow('Invalid CPF format');
      
      expect(() => new Student('Invalid User', '123.456.789', 'test@email.com'))
        .toThrow('Invalid CPF format');
        
      expect(() => new Student('Invalid User', '1234', 'test@email.com'))
        .toThrow('Invalid CPF format');
    });

    test('should reject CPF with more than 11 digits', () => {
      expect(() => new Student('Invalid User', '123456789012', 'test@email.com'))
        .toThrow('Invalid CPF format');
      
      expect(() => new Student('Invalid User', '123.456.789-012', 'test@email.com'))
        .toThrow('Invalid CPF format');
    });

    test('should reject CPF with non-numeric characters', () => {
      expect(() => new Student('Invalid User', '1234567890a', 'test@email.com'))
        .toThrow('Invalid CPF format');
      
      expect(() => new Student('Invalid User', 'abcdefghijk', 'test@email.com'))
        .toThrow('Invalid CPF format');
        
      expect(() => new Student('Invalid User', '123.456.abc-01', 'test@email.com'))
        .toThrow('Invalid CPF format');
        
      expect(() => new Student('Invalid User', '123 456 789 01', 'test@email.com'))
        .toThrow('Invalid CPF format');
    });

    test('should reject empty or null CPF', () => {
      expect(() => new Student('Invalid User', '', 'test@email.com'))
        .toThrow('Invalid CPF format');
      
      expect(() => new Student('Invalid User', '   ', 'test@email.com'))
        .toThrow('Invalid CPF format');
    });
  });

  describe('validateEmail method', () => {
    test('should accept valid email formats', () => {
      const validEmails = [
        'user@domain.com',
        'test.email@example.org',
        'user+tag@domain.co.uk',
        'firstname.lastname@company.com.br',
        'user123@test-domain.org',
        'email@subdomain.domain.com',
        'simple@domain.io',
        'numbers123@domain456.com'
      ];

      validEmails.forEach(email => {
        expect(() => new Student('Valid User', '12345678901', email)).not.toThrow();
      });
    });

    test('should accept emails with dots before @', () => {
      const emailsWithDots = [
        'p.b@ufpe.br',
        'first.last@university.edu',
        'john.doe.smith@company.com',
        'a.b.c.d@domain.org',
        'user.name@test.com',
        'firstname.middlename.lastname@email.com'
      ];

      emailsWithDots.forEach(email => {
        expect(() => new Student('Valid User', '12345678901', email)).not.toThrow();
      });
    });

    test('should accept emails with special characters before @', () => {
      const specialEmails = [
        'user+tag@domain.com',
        'user-name@domain.com',
        'user_name@domain.com',
        'user123@domain.com',
        'test.user+tag@domain.org'
      ];

      specialEmails.forEach(email => {
        expect(() => new Student('Valid User', '12345678901', email)).not.toThrow();
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',           // Missing @ and domain
        '@domain.com',            // Missing local part
        'user@',                  // Missing domain
        'user@domain',            // Missing TLD
        'user space@domain.com',   // Space in local part
        'user@domain .com',       // Space in domain
        'user@@domain.com',       // Double @
        'user@domain..com',       // Double dot in domain
        '.user@domain.com',       // Starting with dot
        'user.@domain.com',       // Ending with dot before @
        'user@.domain.com',       // Starting domain with dot
        'user@domain.com.',       // Ending domain with dot
        '',                       // Empty string
        '   ',                    // Only spaces
        'user@',                  // Incomplete
        '@',                      // Just @
        'user@domain.',           // Ending with dot
        'user@domain.c',          // TLD too short (needs at least 2 chars)
      ];

      invalidEmails.forEach(email => {
        expect(() => {
          new Student('Invalid User', '12345678901', email);
        }).toThrow('Invalid email format');
      });
    });

    test('should reject emails without proper domain structure', () => {
      const invalidDomainEmails = [
        'user@domain',            // No TLD
        'user@.com',              // No domain name
        'user@domain.',           // TLD missing
        'user@domain..com',       // Double dots
        'user@-domain.com',       // Domain starting with hyphen
        'user@domain-.com'        // Domain ending with hyphen
      ];

      invalidDomainEmails.forEach(email => {
        expect(() => {
          new Student('Invalid User', '12345678901', email);
        }).toThrow('Invalid email format');
      });
    });
  });

  describe('getFormattedCPF method', () => {
    test('should format CPF correctly for display', () => {
      const student = new Student('Test User', '12345678901', 'test@email.com');
      expect(student.getFormattedCPF()).toBe('123.456.789-01');
    });

    test('should format different CPFs correctly', () => {
      const testCases = [
        { input: '11122233344', expected: '111.222.333-44' },
        { input: '98765432100', expected: '987.654.321-00' },
        { input: '00000000000', expected: '000.000.000-00' },
        { input: '12345678901', expected: '123.456.789-01' }
      ];

      testCases.forEach(({ input, expected }) => {
        const student = new Student('Test User', input, 'test@email.com');
        expect(student.getFormattedCPF()).toBe(expected);
      });
    });
  });

  describe('getCPF method', () => {
    test('should return clean CPF without formatting', () => {
      const student = new Student('Test User', '123.456.789-01', 'test@email.com');
      expect(student.getCPF()).toBe('12345678901');
      expect(student.getCPF()).not.toContain('.');
      expect(student.getCPF()).not.toContain('-');
    });
  });

  describe('toJSON method', () => {
    test('should return properly formatted JSON object', () => {
      const student = new Student('João Silva', '12345678901', 'joao@email.com');
      const json = student.toJSON();

      expect(json).toEqual({
        name: 'João Silva',
        cpf: '123.456.789-01',  // Should be formatted
        email: 'joao@email.com'
      });
    });

    test('should include formatted CPF in JSON output', () => {
      const student = new Student('Maria Santos', '987.654.321-00', 'maria@email.com');
      const json = student.toJSON();

      expect(json.cpf).toBe('987.654.321-00');
      expect(json.cpf).not.toBe('98765432100'); // Should not be the clean version
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle various CPF input formats consistently', () => {
      const formats = [
        '123.456.789-01',
        '123456789-01',
        '123.456.78901',
        '12345678901'
      ];

      formats.forEach(format => {
        const student = new Student('Test User', format, 'test@email.com');
        expect(student.getCPF()).toBe('12345678901');
        expect(student.getFormattedCPF()).toBe('123.456.789-01');
      });
    });

    test('should validate both CPF and email during construction', () => {
      // Both invalid
      expect(() => new Student('Test User', 'invalid-cpf', 'invalid-email'))
        .toThrow(); // Should throw on first validation error (CPF)

      // Valid CPF, invalid email
      expect(() => new Student('Test User', '12345678901', 'invalid-email'))
        .toThrow('Invalid email format');

      // Invalid CPF, valid email
      expect(() => new Student('Test User', 'invalid-cpf', 'test@email.com'))
        .toThrow('Invalid CPF format');
    });

    test('should handle whitespace in inputs', () => {
      // CPF with spaces (should be cleaned and fail validation due to length)
      expect(() => new Student('Test User', ' 123 456 789 01 ', 'test@email.com'))
        .toThrow('Invalid CPF format');

      // Email with spaces (should fail validation)
      expect(() => new Student('Test User', '12345678901', ' test@email.com '))
        .toThrow('Invalid email format');
    });
  });
});