/**
 * Configuração centralizada das variáveis de ambiente
 * 
 * Este arquivo centraliza o acesso a todas as variáveis de ambiente,
 * facilitando a manutenção e validação das configurações.
 */

// Carrega variáveis de ambiente do arquivo .env
// Importa dotenv e configura antes de qualquer outra coisa
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Resolve caminho para o arquivo .env
const currentDir = process.cwd(); // Diretório de trabalho atual (geralmente server/)
const serverEnvPath = path.resolve(currentDir, '.env'); // .env no diretório server/
const workspaceEnvPath = path.resolve(currentDir, '../.env'); // .env na raiz do workspace

// Tenta carregar primeiro do diretório server/, depois da raiz do workspace
let envLoaded = false;

if (fs.existsSync(serverEnvPath)) {
  const result = dotenv.config({ path: serverEnvPath });
  if (!result.error) {
    console.log('✅ Carregado .env de:', serverEnvPath);
    envLoaded = true;
  } else {
    console.error('❌ Erro ao carregar .env de server:', result.error.message);
  }
} else if (fs.existsSync(workspaceEnvPath)) {
  const result = dotenv.config({ path: workspaceEnvPath });
  if (!result.error) {
    console.log('✅ Carregado .env de:', workspaceEnvPath);
    envLoaded = true;
  } else {
    console.error('❌ Erro ao carregar .env do workspace:', result.error.message);
  }
}

// Fallback: tenta carregar do diretório atual se nenhum arquivo específico foi encontrado
if (!envLoaded) {
  console.warn('⚠️  Arquivo .env não encontrado em:', serverEnvPath, 'ou', workspaceEnvPath);
  console.warn('   Tentando carregar do diretório atual...');
  dotenv.config();
}

/**
 * Configuração do servidor
 */
export const serverConfig = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3005',
} as const;

/**
 * Configuração do Gemini (Google AI)
 */
export const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  timeout: parseInt(process.env.GEMINI_TIMEOUT || '120000', 10),
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10),
} as const;

// Debug: mostra se as variáveis foram carregadas (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Debug - Variáveis carregadas:');
  console.log('  GEMINI_API_KEY:', geminiConfig.apiKey ? '✅ Configurada' : '❌ Não configurada');
  console.log('  QSTASH_TOKEN:', process.env.QSTASH_TOKEN ? '✅ Configurada' : '❌ Não configurada');
}

/**
 * Configuração do QStash
 */
export const qstashConfig = {
  token: process.env.QSTASH_TOKEN || '',
  queueName: process.env.QSTASH_QUEUE_NAME || 'questions',
  webhookUrl: process.env.QSTASH_WEBHOOK_URL || `${serverConfig.apiBaseUrl}/api/question-ai-correction`,
  baseUrl: process.env.QSTASH_BASE_URL || 'https://qstash.upstash.io',
} as const;

/**
 * Valida se as configurações obrigatórias estão presentes
 * @returns Array de erros encontrados (vazio se tudo estiver OK)
 */
export function validateConfig(): string[] {
  const errors: string[] = [];

  // Validações opcionais - apenas avisos em desenvolvimento
  if (serverConfig.nodeEnv === 'development') {
    if (!geminiConfig.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY não configurada');
    }
    if (!qstashConfig.token) {
      console.warn('⚠️  QSTASH_TOKEN não configurada - usando processamento local');
    }
  }

  // Validações obrigatórias para produção
  if (serverConfig.nodeEnv === 'production') {
    if (!geminiConfig.apiKey) {
      errors.push('GEMINI_API_KEY é obrigatória em produção');
    }
  }

  return errors;
}

/**
 * Exporta todas as configurações em um único objeto
 */
export const config = {
  server: serverConfig,
  gemini: geminiConfig,
  qstash: qstashConfig,
} as const;

