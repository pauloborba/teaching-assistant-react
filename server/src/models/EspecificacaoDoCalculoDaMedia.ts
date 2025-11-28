export type Grade = 'MANA' | 'MPA' | 'MA';
type Meta = string;

export class EspecificacaoDoCalculoDaMedia {
    private readonly pesosDosConceitos: Map<Grade, number>; // MA, MPA, MANA
    private readonly pesosDasMetas: Map<Meta, number>; // "Gerência de Configuração", "Gerência de Projeto", etc.
    private readonly somaDosPesosDasMetas: number;

    constructor(pesosIniciasDosConceitos: Map<Grade, number>, pesosIniciaisDasMetas: Map<Meta, number>) 
    {
        // congela os maps depois de criados
        this.pesosDosConceitos = new Map(pesosIniciasDosConceitos);
        this.pesosDasMetas = new Map(pesosIniciaisDasMetas);

        // pré-computa a soma dos pesos das metas (denominador)
        this.somaDosPesosDasMetas = Array.from(pesosIniciaisDasMetas).reduce((acc, v) => acc + v[1], 0);

        if (this.somaDosPesosDasMetas === 0)
            throw new Error("A soma dos pesos das metas não pode ser zero.");
    }

    /**
     * Calcula a média ponderada das notas do aluno.
     * @param metaNotas Map com as metas e as notas alcançadas.
     * @returns A média ponderada como número.
    */
    calc(notasDasMetas: Map<Meta, Grade>): number 
    {
        let somaTotal = 0;

        for (const [meta, conceito] of notasDasMetas.entries()) 
        {
            const pesoDoConceito = this.pesosDosConceitos.get(conceito)!;
            const pesoDaMeta = this.pesosDasMetas.get(meta)!;
            somaTotal += pesoDaMeta * pesoDoConceito;
        }

        return somaTotal / this.somaDosPesosDasMetas;
    }

    // Exporta dados apenas em formato serializável
    toJSON() 
    {
        const mapToObject = <K>(map: Map<K, number>) =>
            Object.fromEntries(Array.from(map.entries()) as [any, number][]);

        return {
            pesosDosConceitos: mapToObject(this.pesosDosConceitos),
            pesosDasMetas: mapToObject(this.pesosDasMetas)
        };
    }

    // Reconstrói uma instância a partir de dados serializados
    static fromJSON(data: any): EspecificacaoDoCalculoDaMedia {
        const normalize = (x: any): Map<string, number> => {
            if (!x) return new Map();
            // já é objeto { key: value, ... }
            if (!Array.isArray(x) && typeof x === 'object') {
            return new Map(Object.entries(x).map(([k, v]) => [k, Number(v)]));
            }
            // formato antigo: array de { key, value }  ou array de [key, value]
            if (Array.isArray(x)) {
            // array de objetos {key, value}
            if (x.length > 0 && typeof x[0] === 'object' && 'key' in x[0]) {
                return new Map(x.map((entry: any) => [entry.key, Number(entry.value)]));
            }
            // array de pares [key, value]
            return new Map(x.map((entry: any) => [entry[0], Number(entry[1])]));
            }
            // fallback
            return new Map();
        };
    
        const pesoDosConceitos = normalize(data.pesosDosConceitos);
        const pesoDasMetas = normalize(data.pesosDasMetas);
    
        return new EspecificacaoDoCalculoDaMedia(pesoDosConceitos as Map<any, number>, pesoDasMetas as Map<any, number>);
    }
}


const DEFAULT_PESOS_DOS_CONCEITOS = new Map<Grade, number>([
  ['MA', 10],
  ['MPA', 7],
  ['MANA', 0],
]);

const DEFAULT_PESOS_DAS_METAS = new Map<Meta, number>([
  ['Gerência de Configuração', 1],
  ['Gerência de Projeto', 1],
  ['Qualidade de Software', 1],
]);

export const DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA = new EspecificacaoDoCalculoDaMedia(
  DEFAULT_PESOS_DOS_CONCEITOS,
  DEFAULT_PESOS_DAS_METAS
);