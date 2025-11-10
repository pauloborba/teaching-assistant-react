// TODO: Melhorar essa extensão de classe
export abstract class SpreadsheetReader <TOut = any>{
  filepath: string;
  mapping: { [key: string]: string };
  default_fields: string[];

  constructor(
    filepath: string,
    mapping: { [key: string]: string },
    default_fields: string[],
  ) {
    this.filepath = filepath;
    this.mapping = mapping;
    this.default_fields = default_fields;
  }

  /** Valida campos obrigatórios */
   protected validateDefaults(header: string[]) {
     for (const field of this.default_fields) {
       if (!header.includes(field)) {
         throw new Error(`Campo obrigatório faltando: ${field}`);
       }
     }
   }

   /** Leitura genérica do arquivo */
   protected async loadFile(): Promise<TOut> {
     const fs = await import("fs/promises");
     const content = await fs.readFile(this.filepath);
     return content as TOut;
   }
    /** Deve ser implementado por subclasses */
    abstract process(): Promise<any[]>;
}


export class CSVReader extends SpreadsheetReader<any[]> {
  async loadFile(): Promise<any> {
    const fs = await import("fs/promises");
    return fs.readFile(this.filepath, "utf-8");
  }

  async process(): Promise<any[]> {
    throw new Error("Method not implemented yet");
  }
}

export class XLSXReader extends SpreadsheetReader<any[]> {
  async loadFile(): Promise<any> {
    const fs = await import("fs/promises");
    return fs.readFile(this.filepath, "utf-8");
  }

  async process(): Promise<any[]> {
    throw new Error("Method not implemented yet");
  }
}