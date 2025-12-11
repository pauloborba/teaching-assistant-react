import express from 'express';
import cors from 'cors';
import routes from '../../src/routes';

/**
 * Cria uma instância do app Express para testes (sem subir servidor real)
 */
export function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', routes);
  return app;
}

