import { getStudentStatusColor } from '../models/StudentStatusColor';

describe('getStudentStatusColor (unit tests)', () => {

  test('returns red when temReprovacaoAnterior is true (regardless of averages)', () => {
    expect(getStudentStatusColor(9.0, 7.5, true)).toBe('red');
    expect(getStudentStatusColor(2.0, 8.0, true)).toBe('red');
  });

  test('returns green when mediaAluno is equal to mediaTurma', () => {
    expect(getStudentStatusColor(7.5, 7.5, false)).toBe('green');
  });

  test('returns green when mediaAluno is greater than mediaTurma', () => {
    expect(getStudentStatusColor(8.0, 7.5, false)).toBe('green');
  });

  test('returns yellow when mediaAluno is up to 10% below mediaTurma and no previous failures', () => {
    expect(getStudentStatusColor(6.3, 7.0, false)).toBe('yellow');
    expect(getStudentStatusColor(9.0, 10.0, false)).toBe('yellow');
  });

  test('returns red when mediaAluno is more than 10% below mediaTurma and no previous failures', () => {
    expect(getStudentStatusColor(6.29, 7.0, false)).toBe('red');
    expect(getStudentStatusColor(5.5, 7.0, false)).toBe('red');
  });

  test('returns green when mediaTurma is zero', () => {
    expect(getStudentStatusColor(5.0, 0, false)).toBe('green');
    expect(getStudentStatusColor(0, 0, false)).toBe('green');
  });
});
