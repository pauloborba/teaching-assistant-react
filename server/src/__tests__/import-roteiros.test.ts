import request from 'supertest';
import { app, studentSet, classes } from '../server';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import * as fs from 'fs';
import * as path from 'path';

describe('Roteiros - Testes de Importação e Avaliação', () => {
        let testClass: Class;
        const classId = 'Engenharia de Software e Sistemas-2025-1';

        beforeEach(() => {
                // Limpar dados existentes
                const allStudents = studentSet.getAllStudents();
                allStudents.forEach(student => {
                        try {
                                studentSet.removeStudent(student.getCPF());
                        } catch (error) {
                                // Ignorar erros durante limpeza
                        }
                });

                const allClasses = classes.getAllClasses();
                allClasses.forEach(classObj => {
                        try {
                                classes.removeClass(classObj.getClassId());
                        } catch (error) {
                                // Ignorar erros durante limpeza
                        }
                });

                // Criar turma de teste
                testClass = new Class('Engenharia de Software e Sistemas', 1, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
                classes.addClass(testClass);

                // Criar e matricular estudantes
                const studentData = [
                        { name: 'Paulo Borba', cpf: '11111111111', email: 'pb@test.com' },
                        { name: 'Joana Refatoração', cpf: '22222222222', email: 'jr@test.com' },
                        { name: 'Maria Modularidade', cpf: '33333333333', email: 'mm@test.com' },
                        { name: 'Carlos Testes', cpf: '55555555555', email: 'ct@test.com' }
                ];

                studentData.forEach(data => {
                        const student = new Student(data.name, data.cpf, data.email);
                        studentSet.addStudent(student);
                        testClass.addEnrollment(student);
                });
        });

        describe('Testes Unitários - Modelo de Avaliação', () => {
                test('deve aceitar roteiros como goals válidos', () => {
                        const student = studentSet.findStudentByCPF('11111111111');
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');

                        expect(enrollment).toBeDefined();

                        // Adicionar avaliações de roteiros
                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MA');
                        enrollment!.addOrUpdateEvaluation('Roteiro 2', 'MPA');
                        enrollment!.addOrUpdateEvaluation('Roteiro 3', 'MANA');

                        // Verificar que foram adicionadas
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 2')?.getGrade()).toBe('MPA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 3')?.getGrade()).toBe('MANA');
                });

                test('deve atualizar avaliação de roteiro existente', () => {
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');

                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MANA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MANA');

                        // Atualizar
                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MA');

                        // Verificar que não duplicou
                        const evaluations = enrollment!.getEvaluations();
                        const roteiroEvals = evaluations.filter(e => e.getGoal() === 'Roteiro 1');
                        expect(roteiroEvals.length).toBe(1);
                });

                test('deve remover avaliação de roteiro', () => {
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');

                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')).toBeDefined();

                        const removed = enrollment!.removeEvaluation('Roteiro 1');
                        expect(removed).toBe(true);
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')).toBeUndefined();
                });

                test('deve permitir 6 roteiros independentes', () => {
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');

                        for (let i = 1; i <= 6; i++) {
                                enrollment!.addOrUpdateEvaluation(`Roteiro ${i}`, 'MA');
                        }

                        // Verificar todos os roteiros
                        for (let i = 1; i <= 6; i++) {
                                expect(enrollment!.getEvaluationForGoal(`Roteiro ${i}`)?.getGrade()).toBe('MA');
                        }

                        const evaluations = enrollment!.getEvaluations();
                        const roteiroEvals = evaluations.filter(e => e.getGoal().startsWith('Roteiro'));
                        expect(roteiroEvals.length).toBe(6);
                });
        });

        describe('Testes de Integração - Importação de Roteiros via CSV', () => {
                const csvFilePath = path.join(__dirname, 'tests_files', 'import_roteiros.csv');

                test('STEP 1 - deve fazer upload de CSV de roteiros e retornar colunas', async () => {
                        const response = await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .attach('file', csvFilePath)
                                .expect(200);

                        expect(response.body).toHaveProperty('session_string');
                        expect(response.body).toHaveProperty('file_columns');
                        expect(response.body).toHaveProperty('mapping_colums');

                        // Verificar que as colunas dos roteiros estão presentes
                        expect(response.body.file_columns).toContain('cpf');
                        expect(response.body.file_columns).toContain('Roteiro 1');
                        expect(response.body.file_columns).toContain('Roteiro 2');
                        expect(response.body.file_columns).toContain('Roteiro 6');

                        // Verificar que o backend reconhece os roteiros como goals válidos
                        expect(response.body.mapping_colums).toContain('Roteiro 1');
                        expect(response.body.mapping_colums).toContain('Roteiro 6');
                });

                test('STEP 2 - deve importar notas de roteiros com mapeamento', async () => {
                        // Step 1: Upload
                        const uploadResponse = await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .attach('file', csvFilePath)
                                .expect(200);

                        const sessionString = uploadResponse.body.session_string;

                        // Step 2: Mapping
                        const mapping = {
                                cpf: 'cpf',
                                'Roteiro 1': 'Roteiro 1',
                                'Roteiro 2': 'Roteiro 2',
                                'Roteiro 3': 'Roteiro 3',
                                'Roteiro 4': 'Roteiro 4',
                                'Roteiro 5': 'Roteiro 5',
                                'Roteiro 6': 'Roteiro 6'
                        };

                        const response = await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .send({
                                        session_string: sessionString,
                                        mapping: mapping
                                })
                                .expect(200);

                        expect(response.body).toBeInstanceOf(Array);
                        expect(response.body.length).toBe(3);

                        // Verificar que as notas foram importadas
                        const student1 = response.body.find((s: any) => s.cpf === '11111111111');
                        expect(student1['Roteiro 1']).toBe('MA');
                        expect(student1['Roteiro 2']).toBe('MPA');
                        expect(student1['Roteiro 6']).toBe('MPA');
                });

                test('STEP 2 - deve importar apenas roteiros selecionados no mapeamento', async () => {
                        // Step 1: Upload
                        const uploadResponse = await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .attach('file', csvFilePath)
                                .expect(200);

                        const sessionString = uploadResponse.body.session_string;

                        // Step 2: Mapear apenas Roteiro 1 e Roteiro 3
                        const partialMapping = {
                                cpf: 'cpf',
                                'Roteiro 1': 'Roteiro 1',
                                'Roteiro 3': 'Roteiro 3'
                        };

                        await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .send({
                                        session_string: sessionString,
                                        mapping: partialMapping
                                })
                                .expect(200);

                        // Verificar que apenas os roteiros mapeados foram importados
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 3')?.getGrade()).toBe('MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 2')).toBeUndefined();
                        expect(enrollment!.getEvaluationForGoal('Roteiro 4')).toBeUndefined();
                });

                test('deve validar conceitos inválidos em importação de roteiros', async () => {
                        // Criar arquivo temporário com conceito inválido
                        const invalidCsvPath = path.join(__dirname, 'tests_files', 'import_roteiros_invalid.csv');
                        const invalidContent = 'cpf,Roteiro 1\n11111111111,INVALIDO';
                        fs.writeFileSync(invalidCsvPath, invalidContent);

                        try {
                                const uploadResponse = await request(app)
                                        .post(`/api/classes/gradeImport/${classId}`)
                                        .attach('file', invalidCsvPath)
                                        .expect(200);

                                const mapping = { cpf: 'cpf', 'Roteiro 1': 'Roteiro 1' };

                                const response = await request(app)
                                        .post(`/api/classes/gradeImport/${classId}`)
                                        .send({
                                                session_string: uploadResponse.body.session_string,
                                                mapping: mapping
                                        })
                                        .expect(400);

                                expect(response.body.error).toContain('Invalid grade');
                        } finally {
                                // Limpar arquivo temporário
                                if (fs.existsSync(invalidCsvPath)) {
                                        fs.unlinkSync(invalidCsvPath);
                                }
                        }
                });

                test('não deve sobrescrever roteiros existentes na importação', async () => {
                        // Adicionar avaliação manual primeiro
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');
                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MANA');

                        // Importar CSV com valor diferente
                        const uploadResponse = await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .attach('file', csvFilePath)
                                .expect(200);

                        const mapping = { cpf: 'cpf', 'Roteiro 1': 'Roteiro 1' };

                        await request(app)
                                .post(`/api/classes/gradeImport/${classId}`)
                                .send({
                                        session_string: uploadResponse.body.session_string,
                                        mapping: mapping
                                })
                                .expect(200);

                        // Verificar que manteve o valor original (MANA, não MA do CSV)
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MANA');
                });
        });

        describe('Testes de Integração - Mistura de Avaliações Gerais e Roteiros', () => {
                test('deve permitir avaliar estudante com metas gerais e roteiros simultaneamente', async () => {
                        const enrollment = testClass.findEnrollmentByStudentCPF('11111111111');

                        // Adicionar avaliações gerais
                        enrollment!.addOrUpdateEvaluation('Requirements', 'MA');
                        enrollment!.addOrUpdateEvaluation('Design', 'MPA');

                        // Adicionar roteiros
                        enrollment!.addOrUpdateEvaluation('Roteiro 1', 'MA');
                        enrollment!.addOrUpdateEvaluation('Roteiro 2', 'MANA');

                        // Verificar que todas foram salvas
                        expect(enrollment!.getEvaluations().length).toBe(4);
                        expect(enrollment!.getEvaluationForGoal('Requirements')?.getGrade()).toBe('MA');
                        expect(enrollment!.getEvaluationForGoal('Roteiro 1')?.getGrade()).toBe('MA');
                });
        });
});
