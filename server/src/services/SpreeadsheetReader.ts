import readline from "readline";
import fs from "fs";
import { promises as fsP } from "fs";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";

export abstract class SpreadsheetReader{
  filepath: string;

  constructor(
    filepath: string,
  ) {
    this.filepath = filepath;
  }

   /** Leitura genérica do arquivo, como bytes em buffer */
   protected async loadFile(): Promise<Buffer> {
     const content = fsP.readFile(this.filepath);
     return content;
   }
    /** Deve ser implementado por subclasses */
    abstract process(): Promise<any[]>;
    abstract getColumns(): Promise<string[]>;
}


export class CSVReader extends SpreadsheetReader {
  async process(): Promise<any[]> {
    const results: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(this.filepath)
        .pipe(csvParser())
        .on("data", data => results.push(data))
        .on("end", () => resolve(results))
        .on("error", reject);
    });
  }

  // le apenas a primeira linha, se
  getColumns(): Promise<string[]> {
    const fsStream = fs.createReadStream(this.filepath);
    const rl = readline.createInterface({ input: fsStream, crlfDelay: Infinity });

    // le apenas a primeira linha de forma async
    return new Promise((resolve, reject) => {
      rl.on("line", (line) => {
        rl.close();
        resolve(line.split(",").map(c => c.trim()));
      });

      rl.on("error", (err) => {
        reject(err);
      });
    });

  }
}

export class XLSXReader extends SpreadsheetReader {
  async process(): Promise<any[]> {
    const workbook = XLSX.readFile(this.filepath);
    const sheetName1 = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName1];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  }

  async getColumns(): Promise<string[]> {
    const workbook = XLSX.readFile(this.filepath);
    const sheetName1 = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName1];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length === 0) {
      return [];
    }
    
    return data[0].map((col: any) => String(col).trim());
  }
}
