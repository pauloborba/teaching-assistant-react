import { BeforeAll, AfterAll } from '@cucumber/cucumber';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DATA_PATH = path.resolve(__dirname, '../../../server/data');

const FILES_TO_BACKUP = [
    'exam-generations.json',
    'exams.json',
    'students-exams.json',
];

const backups: Record<string, string> = {};


BeforeAll(async () => {
    console.log('\n🔒 [Test Hook] Iniciando backup dos dados do servidor...');
    
    for (const file of FILES_TO_BACKUP) {
        const filePath = path.join(SERVER_DATA_PATH, file);
        if (fs.existsSync(filePath)) {
            backups[file] = fs.readFileSync(filePath, 'utf-8');
        } else {
            backups[file] = null as any;
        }
    }
    console.log('✅ [Test Hook] Backup concluído. Os testes podem sujar o banco à vontade.\n');
});

AfterAll(async () => {
    console.log('\n[Test Hook] Restaurando dados originais do servidor...');

    for (const file of FILES_TO_BACKUP) {
        const filePath = path.join(SERVER_DATA_PATH, file);
        const originalContent = backups[file];

        if (originalContent !== null && originalContent !== undefined) {
            fs.writeFileSync(filePath, originalContent, 'utf-8');
        } else {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
    console.log('[Test Hook] Restauração concluída. Ambiente limpo.\n');
});