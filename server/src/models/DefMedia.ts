export type Grade = 'MANA' | 'MPA' | 'MA';
type Meta = string;

export class DefMedia {
    private readonly conceito_peso: Map<Grade, number>; // MA, MPA, MANA
    private readonly meta_peso: Map<Meta, number>; // "Gerência de Configuração", "Gerência de Projeto", etc.
    private readonly somaPesosMeta: number;

    constructor(conceitoPesoInicial: Map<Grade, number>, metaPesoInicial: Map<Meta, number>) 
    {
        // congela os maps depois de criados
        this.conceito_peso = new Map(conceitoPesoInicial);
        this.meta_peso = new Map(metaPesoInicial);

        // pré-computa a soma dos pesos das metas (denominador)
        this.somaPesosMeta = Array.from(metaPesoInicial).reduce((acc, v) => acc + v[1], 0);

        if (this.somaPesosMeta === 0)
            throw new Error("A soma dos pesos das metas não pode ser zero.");
    }

    /**
     * Calcula a média ponderada das notas do aluno.
     * @param metaNotas Map com as metas e as notas alcançadas.
     * @returns A média ponderada como número.
    */
    calc(metaNotas: Map<Meta, Grade>): number 
    {
        let somaTotal = 0;

        for (const [meta, conceito] of metaNotas.entries()) 
        {
            const pesoConceito = this.conceito_peso.get(conceito)!;
            const pesoMeta = this.meta_peso.get(meta)!;
            somaTotal += pesoMeta * pesoConceito;
        }

        return somaTotal / this.somaPesosMeta;
    }

    // Exporta dados apenas em formato serializável
    toJSON() 
    {
        const mapToObject = <K>(map: Map<K, number>) =>
            Object.fromEntries(Array.from(map.entries()) as [any, number][]);

        return {
            conceitoPeso: mapToObject(this.conceito_peso),
            metaPeso: mapToObject(this.meta_peso)
        };
    }

    // Reconstrói uma instância a partir de dados serializados (suporta variantes)
    static fromJSON(data: any): DefMedia {
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

    const conceitoMap = normalize(data.conceitoPeso);
    const metaMap = normalize(data.metaPeso);

    return new DefMedia(conceitoMap as Map<any, number>, metaMap as Map<any, number>);
    }
}
