// especificacao_calculo_media.test.ts
import { EspecificacaoDoCalculoDaMedia, Grade, Meta, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

describe('EspecificacaoDoCalculoDaMedia', () => {
  // Teste 1: Criação da classe com dados válidos
  it('deve criar uma instância com pesos válidos', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Gerência de Configuração', 1],
      ['Gerência de Projeto', 2],
      ['Qualidade de Software', 3],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    expect(especificacao).toBeInstanceOf(EspecificacaoDoCalculoDaMedia);
  });
  
  // Teste 2: Exceção quando soma dos pesos das metas é zero
  it('deve lançar erro quando soma dos pesos das metas é zero', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Meta 1', 0],
      ['Meta 2', 0],
      ['Meta 3', 0],
    ]);
    
    expect(() => {
      new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    }).toThrow('A soma dos pesos das metas não pode ser zero.');
  });
  
  // Teste 3: Cálculo de média com todos os conceitos MA
  it('deve calcular média 10 quando todas as notas são MA', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Gerência de Configuração', 2],
      ['Gerência de Projeto', 3],
      ['Qualidade de Software', 1],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    const notasAluno = new Map<Meta, Grade>([
      ['Gerência de Configuração', 'MA'],
      ['Gerência de Projeto', 'MA'],
      ['Qualidade de Software', 'MA'],
    ]);
    
    const media = especificacao.calc(notasAluno);
    expect(media).toBe(10);
  });
  
  // Teste 4: Cálculo de média com conceitos variados
  it('deve calcular média ponderada corretamente com conceitos diferentes', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Gerência de Configuração', 2],
      ['Gerência de Projeto', 3],
      ['Qualidade de Software', 1],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    const notasAluno = new Map<Meta, Grade>([
      ['Gerência de Configuração', 'MA'],    // 2 * 10 = 20
      ['Gerência de Projeto', 'MPA'],        // 3 * 7 = 21
      ['Qualidade de Software', 'MANA'],     // 1 * 0 = 0
    ]);
    
    const media = especificacao.calc(notasAluno);
    // (20 + 21 + 0) / (2 + 3 + 1) = 41 / 6 = 6.8333...
    expect(media).toBeCloseTo(6.8333, 4);
  });
  
  // Teste 5: Cálculo com pesos de conceitos diferentes
  it('deve calcular corretamente com pesos de conceitos customizados', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 9],
      ['MPA', 6],
      ['MANA', 3],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Meta A', 4],
      ['Meta B', 6],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    const notasAluno = new Map<Meta, Grade>([
      ['Meta A', 'MA'],    // 4 * 9 = 36
      ['Meta B', 'MPA'],   // 6 * 6 = 36
    ]);
    
    const media = especificacao.calc(notasAluno);
    // (36 + 36) / (4 + 6) = 72 / 10 = 7.2
    expect(media).toBe(7.2);
  });
  
  // Teste 6: Serialização e desserialização
  it('deve serializar e desserializar corretamente', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Gerência de Configuração', 1],
      ['Gerência de Projeto', 2],
      ['Qualidade de Software', 3],
    ]);
    
    const original = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    const json = original.toJSON();
    
    const reconstruida = EspecificacaoDoCalculoDaMedia.fromJSON(json);
    const jsonReconstruida = reconstruida.toJSON();
    
    expect(jsonReconstruida).toEqual(json);
    
    // Testar se o cálculo funciona igual
    const notas = new Map<Meta, Grade>([
      ['Gerência de Configuração', 'MA'],
      ['Gerência de Projeto', 'MPA'],
      ['Qualidade de Software', 'MANA'],
    ]);
    
    expect(reconstruida.calc(notas)).toBe(original.calc(notas));
  });
  
  // Teste 7: Desserialização com formato antigo (array de pares)
  it('deve desserializar formato antigo (array de pares)', () => {
    const jsonAntigo = {
      pesosDosConceitos: [['MA', 10], ['MPA', 7], ['MANA', 0]],
      pesosDasMetas: [['Gerência de Configuração', 1], ['Gerência de Projeto', 2]]
    };
    
    const especificacao = EspecificacaoDoCalculoDaMedia.fromJSON(jsonAntigo);
    const json = especificacao.toJSON();
    
    expect(json.pesosDosConceitos).toEqual({
      MA: 10,
      MPA: 7,
      MANA: 0
    });
    
    expect(json.pesosDasMetas).toEqual({
      'Gerência de Configuração': 1,
      'Gerência de Projeto': 2
    });
  });
  
  // Teste 8: Desserialização com formato de array de objetos
  it('deve desserializar formato com array de objetos', () => {
    const jsonAntigo = {
      pesosDosConceitos: [
        { key: 'MA', value: 10 },
        { key: 'MPA', value: 7 },
        { key: 'MANA', value: 0 }
      ],
      pesosDasMetas: [
        { key: 'Gerência de Configuração', value: 1 },
        { key: 'Gerência de Projeto', value: 2 }
      ]
    };
    
    const especificacao = EspecificacaoDoCalculoDaMedia.fromJSON(jsonAntigo);
    const json = especificacao.toJSON();
    
    expect(json.pesosDosConceitos.MA).toBe(10);
    expect(json.pesosDasMetas['Gerência de Projeto']).toBe(2);
  });
  
  // Teste 9: Especificação padrão
  it('deve usar a especificação padrão corretamente', () => {
    const especificacaoPadrao = DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA;
    const json = especificacaoPadrao.toJSON();
    
    expect(json.pesosDosConceitos).toEqual({
      MA: 10,
      MPA: 7,
      MANA: 0
    });
    
    expect(json.pesosDasMetas).toEqual({
      'Gerência de Configuração': 1,
      'Gerência de Projeto': 1,
      'Qualidade de Software': 1
    });
    
    // Testar cálculo com especificação padrão
    const notas = new Map<Meta, Grade>([
      ['Gerência de Configuração', 'MA'],
      ['Gerência de Projeto', 'MPA'],
      ['Qualidade de Software', 'MA'],
    ]);
    
    const media = especificacaoPadrao.calc(notas);
    // (1*10 + 1*7 + 1*10) / 3 = 27 / 3 = 9
    expect(media).toBe(9);
  });
  
  // Teste 10: Cálculo com meta não existente deve lançar erro
  it('deve lançar erro ao calcular com meta não existente', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Meta Existente', 2],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    const notasAluno = new Map<Meta, Grade>([
      ['Meta Existente', 'MA'],
      ['Meta Não Existente', 'MPA'], // Esta meta não tem peso definido
    ]);
    
    // O método get com ! vai lançar erro se for undefined
    expect(() => especificacao.calc(notasAluno)).toThrow();
  });
  
  // Teste 11: Verificar imutabilidade após criação
  it('deve manter os maps imutáveis após criação', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Meta A', 1],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    // Modificar os maps originais não deve afetar a instância
    pesosConceitos.set('MA', 999);
    pesosMetas.set('Meta A', 999);
    
    const json = especificacao.toJSON();
    expect(json.pesosDosConceitos.MA).toBe(10); // Deve manter o valor original
    expect(json.pesosDasMetas['Meta A']).toBe(1); // Deve manter o valor original
  });
  
  // Teste 12: Cálculo com notas vazias
  it('deve retornar 0 quando não há notas', () => {
    const pesosConceitos = new Map<Grade, number>([
      ['MA', 10],
      ['MPA', 7],
      ['MANA', 0],
    ]);
    
    const pesosMetas = new Map<Meta, number>([
      ['Meta A', 2],
      ['Meta B', 3],
    ]);
    
    const especificacao = new EspecificacaoDoCalculoDaMedia(pesosConceitos, pesosMetas);
    
    const notasVazias = new Map<Meta, Grade>();
    const media = especificacao.calc(notasVazias);
    
    expect(media).toBe(0);
  });
});