export type Grade = 'MANA' | 'MPA' | 'MA';
type Meta = string;

export interface EspecificacaoDoCalculoDaMedia {
    pesosDosConceitos: Map<Grade, number>;
    pesosDasMetas: Map<Meta, number>;
}

// TODO: Verificar após a integração com 'Criação e Manuntenção de Metas' 
// se ainda é necessário definir um valor default para pesosDasMetas
export const DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA: EspecificacaoDoCalculoDaMedia = {
    pesosDosConceitos: new Map<Grade, number>([
        ['MA', 10],
        ['MPA', 7],
        ['MANA', 4],
    ]),
    pesosDasMetas: new Map<Meta, number>([ 
        ['Requirements', 1],
        ['Configuration Management', 1], 
        ['Project Management', 1],
        ['Design', 1],
        ['Tests', 1],
        ['Refactoring', 1]
    ]),
};
