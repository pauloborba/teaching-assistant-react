import { Classes } from '../models/Classes';
import { Class } from '../models/Class';

describe('Metas - Classes', () => {
  let classes: Classes;
  const specStub: any = { toJSON: () => ({}) };

  beforeEach(() => {
    classes = new Classes();
  });

  test('deve criar metas para uma turma com sucesso', () => {
    const turma = new Class('engenharia-de-software-e-sistemas', 1, 2024, [], specStub);
    classes.addClass(turma);

    const metas = ['Requisitos', 'Testes de software'];
    classes.addClassMetas(turma.getClassId(), metas);

    expect(classes.getClassMetas(turma.getClassId())).toEqual(metas);
    expect(turma.isMetasLocked()).toBe(true);
  });

  test('deve rejeitar meta com título vazio e não persistir metas', () => {
    const turma = new Class('engenharia-de-software-e-sistemas', 1, 2024, [], specStub);
    classes.addClass(turma);

    expect(() => {
      classes.addClassMetas(turma.getClassId(), ['', 'Testes de software']);
    }).toThrow('Metas não podem ter títulos vazios!');

    expect(classes.getClassMetas(turma.getClassId())).toEqual([]);
    expect(turma.isMetasLocked()).toBe(false);
  });

  test('deve rejeitar metas duplicadas na mesma requisição e não persistir metas', () => {
    const turma = new Class('engenharia-de-software-e-sistemas', 1, 2024, [], specStub);
    classes.addClass(turma);

    expect(() => {
      classes.addClassMetas(turma.getClassId(), ['Requisitos', 'Requisitos']);
    }).toThrow('Metas não podem conter duplicatas!');

    expect(classes.getClassMetas(turma.getClassId())).toEqual([]);
    expect(turma.isMetasLocked()).toBe(false);
  });

  test('deve rejeitar tentativa de criar metas para turma que já possui metas', () => {
    const metasExistentes = ['Comunicação', 'Sincronização'];
    const turma = new Class('sistemas-distribuidos', 2, 2024, metasExistentes, specStub, [], true);
    classes.addClass(turma);

    expect(() => {
      classes.addClassMetas(turma.getClassId(), ['Nova Meta A']);
    }).toThrow('Metas já foram definidas para a turma e não podem ser alteradas!');

    expect(classes.getClassMetas(turma.getClassId())).toEqual(metasExistentes);
    expect(turma.isMetasLocked()).toBe(true);
  });
});