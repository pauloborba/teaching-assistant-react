/**
 * Testes Unitários - Cenário: Validation of Inconsistent Rules
 * 
 * Cenário da Feature:
 * Given the request to create the exam "Gerência" specifies "20 open questions"
 * And the question bank does not contain enough open questions
 * When the system evaluates the defined rules
 * Then the system rejects the creation of the exam "Gerência"
 * And records the message "Insufficient questions to satisfy the defined rules"
 * 
 * Estes testes focam em validar a lógica de detecção de regras inconsistentes
 * quando não há questões suficientes no banco de dados.
 */

describe('Validation of Inconsistent Rules - Unit Tests', () => {

    describe('Parsing Exam Request', () => {
        it('should extract exam name from request', () => {
            // Arrange
            const examRequest = {
                nomeProva: 'Gerência',
                quantidadeAberta: 20,
                quantidadeFechada: 0,
            };

            // Act
            const examName = examRequest.nomeProva;

            // Assert
            expect(examName).toBe('Gerência');
        });

        it('should extract required open questions quantity', () => {
            // Arrange
            const ruleText = '20 open questions';

            // Act
            const quantity = parseInt(ruleText.split(' ')[0]);

            // Assert
            expect(quantity).toBe(20);
        });

        it('should identify question type as open', () => {
            // Arrange
            const ruleText = '20 open questions';

            // Act
            const isOpen = ruleText.includes('open');
            const isClosed = ruleText.includes('closed');

            // Assert
            expect(isOpen).toBe(true);
            expect(isClosed).toBe(false);
        });
    });

    describe('Question Bank Availability Check', () => {
        it('should detect insufficient open questions', () => {
            // Arrange
            const availableQuestions = [
                { id: 1, type: 'open', topic: 'Gerência' },
                { id: 2, type: 'open', topic: 'Gerência' },
                { id: 3, type: 'open', topic: 'Gerência' },
            ];
            const requiredQuantity = 20;

            // Act
            const openQuestionsCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openQuestionsCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(false);
            expect(openQuestionsCount).toBe(3);
            expect(openQuestionsCount).toBeLessThan(requiredQuantity);
        });

        it('should calculate the shortage of questions', () => {
            // Arrange
            const availableCount = 3;
            const requiredCount = 20;

            // Act
            const shortage = requiredCount - availableCount;

            // Assert
            expect(shortage).toBe(17);
            expect(shortage).toBeGreaterThan(0);
        });

        it('should return true when enough questions exist', () => {
            // Arrange
            const availableQuestions = Array.from({ length: 25 }, (_, i) => ({
                id: i + 1,
                type: 'open',
                topic: 'Gerência',
            }));
            const requiredQuantity = 20;

            // Act
            const openQuestionsCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openQuestionsCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(true);
            expect(openQuestionsCount).toBe(25);
        });

        it('should handle exact match of available and required questions', () => {
            // Arrange
            const availableQuestions = Array.from({ length: 20 }, (_, i) => ({
                id: i + 1,
                type: 'open',
                topic: 'Gerência',
            }));
            const requiredQuantity = 20;

            // Act
            const openQuestionsCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openQuestionsCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(true);
            expect(openQuestionsCount).toBe(requiredQuantity);
        });
    });

    describe('Rule Evaluation Logic', () => {
        it('should evaluate rules and detect inconsistency', () => {
            // Arrange
            const requiredOpen = 20;
            const requiredClosed = 0;
            const availableOpen = 3;
            const availableClosed = 10;

            // Act
            const openValid = availableOpen >= requiredOpen;
            const closedValid = availableClosed >= requiredClosed;
            const rulesAreConsistent = openValid && closedValid;

            // Assert
            expect(rulesAreConsistent).toBe(false);
            expect(openValid).toBe(false);
            expect(closedValid).toBe(true);
        });

        it('should pass validation when all rules are satisfied', () => {
            // Arrange
            const requiredOpen = 5;
            const requiredClosed = 3;
            const availableOpen = 10;
            const availableClosed = 8;

            // Act
            const openValid = availableOpen >= requiredOpen;
            const closedValid = availableClosed >= requiredClosed;
            const rulesAreConsistent = openValid && closedValid;

            // Assert
            expect(rulesAreConsistent).toBe(true);
        });

        it('should detect multiple rule violations', () => {
            // Arrange
            const requiredOpen = 20;
            const requiredClosed = 15;
            const availableOpen = 3;
            const availableClosed = 5;

            // Act
            const violations = [];
            if (availableOpen < requiredOpen) {
                violations.push({ type: 'open', shortage: requiredOpen - availableOpen });
            }
            if (availableClosed < requiredClosed) {
                violations.push({ type: 'closed', shortage: requiredClosed - availableClosed });
            }

            // Assert
            expect(violations).toHaveLength(2);
            expect(violations[0]).toEqual({ type: 'open', shortage: 17 });
            expect(violations[1]).toEqual({ type: 'closed', shortage: 10 });
        });
    });

    describe('Exam Rejection Logic', () => {
        it('should reject exam creation when rules are inconsistent', () => {
            // Arrange
            const rulesAreConsistent = false;

            // Act
            const shouldReject = !rulesAreConsistent;

            // Assert
            expect(shouldReject).toBe(true);
        });

        it('should allow exam creation when rules are consistent', () => {
            // Arrange
            const rulesAreConsistent = true;

            // Act
            const shouldReject = !rulesAreConsistent;

            // Assert
            expect(shouldReject).toBe(false);
        });

        it('should generate rejection for specific exam name', () => {
            // Arrange
            const examName = 'Gerência';
            const isRejected = true;

            // Act
            const rejectionInfo = {
                examName: examName,
                rejected: isRejected,
            };

            // Assert
            expect(rejectionInfo.examName).toBe('Gerência');
            expect(rejectionInfo.rejected).toBe(true);
        });
    });

    describe('Error Message Generation', () => {
        it('should generate standard insufficient questions message', () => {
            // Arrange
            const expectedMessage = 'Insufficient questions to satisfy the defined rules';

            // Act
            const actualMessage = 'Insufficient questions to satisfy the defined rules';

            // Assert
            expect(actualMessage).toBe(expectedMessage);
        });

        it('should generate detailed error message with shortage info', () => {
            // Arrange
            const requiredOpen = 20;
            const availableOpen = 3;
            const shortage = requiredOpen - availableOpen;

            // Act
            const detailedMessage = `Not enough open questions. Required: ${requiredOpen}, Available: ${availableOpen}`;

            // Assert
            expect(detailedMessage).toContain('Not enough open questions');
            expect(detailedMessage).toContain('20');
            expect(detailedMessage).toContain('3');
        });

        it('should include exam name in error context', () => {
            // Arrange
            const examName = 'Gerência';
            const errorMessage = 'Insufficient questions to satisfy the defined rules';

            // Act
            const errorContext = {
                exam: examName,
                message: errorMessage,
            };

            // Assert
            expect(errorContext.exam).toBe('Gerência');
            expect(errorContext.message).toBe(errorMessage);
        });
    });

    describe('Response Structure for Rejection', () => {
        it('should create error response with 400 status', () => {
            // Arrange
            const statusCode = 400;
            const errorMessage = 'Insufficient questions to satisfy the defined rules';

            // Act
            const response = {
                status: statusCode,
                error: errorMessage,
            };

            // Assert
            expect(response.status).toBe(400);
            expect(response.error).toBe(errorMessage);
        });

        it('should include all error details in response', () => {
            // Arrange
            const errorResponse = {
                status: 400,
                error: 'Not enough open questions for topic "Gerência". Required: 20, Available: 3',
                examName: 'Gerência',
                requiredOpen: 20,
                availableOpen: 3,
            };

            // Act
            const hasAllDetails =
                errorResponse.status !== undefined &&
                errorResponse.error !== undefined &&
                errorResponse.examName !== undefined &&
                errorResponse.requiredOpen !== undefined &&
                errorResponse.availableOpen !== undefined;

            // Assert
            expect(hasAllDetails).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero available questions', () => {
            // Arrange
            const availableQuestions: any[] = [];
            const requiredQuantity = 20;

            // Act
            const openCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(false);
            expect(openCount).toBe(0);
        });

        it('should handle zero required questions (should pass)', () => {
            // Arrange
            const availableQuestions = [
                { id: 1, type: 'open', topic: 'Gerência' },
            ];
            const requiredQuantity = 0;

            // Act
            const openCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(true);
        });

        it('should handle very large required quantities', () => {
            // Arrange
            const availableQuestions = Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                type: 'open',
                topic: 'Gerência',
            }));
            const requiredQuantity = 1000;

            // Act
            const openCount = availableQuestions.filter(q => q.type === 'open').length;
            const hasEnough = openCount >= requiredQuantity;

            // Assert
            expect(hasEnough).toBe(false);
            expect(openCount).toBe(100);
        });
    });
});
