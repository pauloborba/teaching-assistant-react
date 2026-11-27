import { describe, beforeEach, test, expect } from '@jest/globals';
import { RoteiroService } from '../services/RoteiroService';
import { RoteiroList } from '../models/RoteiroList';
import { Atividade } from '../models/Atividade';

describe('RoteiroService - Testes de Unidade', () => {
  let service: RoteiroService;
  let lista: RoteiroList;

  beforeEach(() => {
    lista = new RoteiroList();
    service = new RoteiroService(lista);
  });

  // --- INSERÇÃO ---

  test('deve inserir um novo roteiro completo com sucesso', () => {
    const roteiro = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      descricao: 'Prática de versionamento com commits, branches e merge',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
      atividades: 'Criar repositório; Criar branch; Resolver conflito',
    });

    expect(roteiro.getTitulo()).toBe('Tutorial de Git');
    expect(roteiro.getDescricao()).toBe(
      'Prática de versionamento com commits, branches e merge'
    );
    expect(roteiro.getTurma()).toBe('ESS - 2026.2');
    expect(roteiro.getDataAbertura()).toBe('10/11/2026');
    expect(roteiro.getPrazoEntrega()).toBe('17/11/2026');
    expect(roteiro.getAtividades()).toHaveLength(3);
    expect(roteiro.getAtividades().map((a) => a.getDescricao())).toEqual([
      'Criar repositório',
      'Criar branch',
      'Resolver conflito',
    ]);
    expect(lista.findByTitulo('Tutorial de Git', 'ESS - 2026.2')).toBeDefined();
  });

  test('deve bloquear inserção de roteiro sem título e manter estado anterior da turma', () => {
    const existente = service.inserirRoteiro({
      titulo: 'Introdução ao GitHub',
      descricao: 'Conceitos básicos',
      turma: 'ESS - 2026.2',
      dataAbertura: '01/11/2026',
      prazoEntrega: '10/11/2026',
    });

    expect(() =>
      service.inserirRoteiro({
        titulo: '   ',
        descricao: 'Prática de commits',
        turma: 'ESS - 2026.2',
        dataAbertura: '10/11/2026',
        prazoEntrega: '17/11/2026',
      })
    ).toThrow('O título do roteiro é obrigatório');

    const roteirosDaTurma = lista.listByTitulo('ESS - 2026.2');
    expect(roteirosDaTurma).toHaveLength(1);
    expect(roteirosDaTurma[0].id).toBe(existente.id);
    expect(roteirosDaTurma[0].getTitulo()).toBe('Introdução ao GitHub');
  });

  test('deve bloquear inserção de roteiro com prazo anterior à data de abertura', () => {
    expect(() =>
      service.inserirRoteiro({
        titulo: 'Tutorial de Git',
        turma: 'ESS - 2026.2',
        dataAbertura: '17/11/2026',
        prazoEntrega: '10/11/2026',
      })
    ).toThrow('Prazo de entrega inválido: não pode ser anterior à data de abertura');

    expect(lista.findByTitulo('Tutorial de Git', 'ESS - 2026.2')).toBeUndefined();
    expect(lista.getAll()).toHaveLength(0);
  });

  test('deve bloquear inserção de roteiro com título duplicado na mesma turma', () => {
    service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
    });

    expect(() =>
      service.inserirRoteiro({
        titulo: 'Tutorial de Git',
        turma: 'ESS - 2026.2',
        dataAbertura: '12/11/2026',
        prazoEntrega: '20/11/2026',
      })
    ).toThrow('Já existe um roteiro com o título "Tutorial de Git" na turma "ESS - 2026.2"');

    const daTurma = lista
      .getAll()
      .filter(
        (r) =>
          r.getTurma() === 'ESS - 2026.2' && r.getTitulo() === 'Tutorial de Git'
      );
    expect(daTurma).toHaveLength(1);
  });

  // --- ATUALIZAÇÃO ---

  test('deve atualizar prazo e atividades preservando título, descrição e demais dados', () => {
    const criado = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      descricao: 'Prática de versionamento',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
      atividades: [new Atividade('Criar repositório'), new Atividade('Criar branch')],
    });

    const atividadesAtuais = criado.getAtividades().map((a) => a.getDescricao());
    const atualizado = service.atualizarRoteiro(criado.id, {
      prazoEntrega: '24/11/2026',
      atividades: [...atividadesAtuais, 'Resolver conflito'],
    });

    expect(atualizado.getPrazoEntrega()).toBe('24/11/2026');
    expect(atualizado.getAtividades()).toHaveLength(3);
    expect(atualizado.getTitulo()).toBe('Tutorial de Git');
    expect(atualizado.getDescricao()).toBe('Prática de versionamento');
    expect(atualizado.getTurma()).toBe('ESS - 2026.2');
    expect(atualizado.getDataAbertura()).toBe('10/11/2026');
  });

  test('deve atualizar o título de um roteiro e remover referência ao título antigo na busca', () => {
    const criado = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
    });

    const atualizado = service.atualizarRoteiro(criado.id, {
      titulo: 'Tutorial Avançado de Git',
    });

    expect(atualizado.getTitulo()).toBe('Tutorial Avançado de Git');
    expect(
      lista.findByTitulo('Tutorial Avançado de Git', 'ESS - 2026.2')
    ).toBeDefined();
    expect(lista.findByTitulo('Tutorial de Git', 'ESS - 2026.2')).toBeUndefined();
  });

  test('deve bloquear atualização removendo o título e manter o título anterior', () => {
    const criado = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
    });

    expect(() =>
      service.atualizarRoteiro(criado.id, {
        titulo: '',
      })
    ).toThrow('O título do roteiro é obrigatório');

    expect(lista.findById(criado.id)?.getTitulo()).toBe('Tutorial de Git');
  });

  test('deve bloquear atualização para um título já existente na mesma turma', () => {
    service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
    });

    const intro = service.inserirRoteiro({
      titulo: 'Introdução ao GitHub',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
    });

    expect(() =>
      service.atualizarRoteiro(intro.id, {
        titulo: 'Tutorial de Git',
      })
    ).toThrow('Já existe um roteiro com o título "Tutorial de Git" na turma "ESS - 2026.2"');

    expect(lista.findById(intro.id)?.getTitulo()).toBe('Introdução ao GitHub');
  });

  // --- REMOÇÃO ---

  test('deve remover roteiro sem respostas de alunos', () => {
    const criado = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
      atividades: 'Ativ 1; Ativ 2; Ativ 3',
      respostas: [],
    });

    const removido = service.removerRoteiro(criado.id);
    expect(removido).toBe(true);
    expect(lista.findById(criado.id)).toBeUndefined();
  });

  test('deve bloquear remoção de roteiro com respostas de alunos e preservar respostas', () => {
    const respostasIniciais = [
      { alunoNome: 'Mariana', resposta: 'Entrega 1' },
      { alunoNome: 'Pedro', resposta: 'Entrega 2' },
    ];

    const criado = service.inserirRoteiro({
      titulo: 'Tutorial de Git',
      turma: 'ESS - 2026.2',
      dataAbertura: '10/11/2026',
      prazoEntrega: '17/11/2026',
      respostas: respostasIniciais,
    });

    expect(() => service.removerRoteiro(criado.id)).toThrow(
      'Não é possível remover o roteiro pois ele já possui respostas de alunos'
    );

    const preservado = lista.findById(criado.id);
    expect(preservado).toBeDefined();
    expect(preservado?.possuiRespostas()).toBe(true);
    expect(preservado?.getRespostas()).toEqual(respostasIniciais);
  });
});