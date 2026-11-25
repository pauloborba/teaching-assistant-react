import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export function atomicWriteJson(
    filePath: string,
    data: unknown
): void {
    const directory = path.dirname(filePath);

    const content = JSON.stringify(data, null, 2);

    const temporaryPath = path.join(
        directory,
        `.${path.basename(filePath)}.${randomUUID()}.tmp`
    );

    fs.mkdirSync(directory, { recursive: true });

    try {
        fs.writeFileSync(temporaryPath, content, {
            encoding: 'utf8',
            flag: 'wx'
        });

        fs.renameSync(temporaryPath, filePath);

    } catch (error) {
        // A limpeza não deve esconder o erro original.
        try {
            fs.rmSync(temporaryPath, { force: true });
        } catch (cleanupError) {
            console.error(
                'Falha ao remover arquivo temporário:',
                cleanupError
            );
        }

        throw error;
    }
}
