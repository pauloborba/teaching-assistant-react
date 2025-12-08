import express from 'express';
import cors from 'cors';
import routes from '../../routes';

/**
 * Cria uma instância do app Express para testes
 * Sem inicializar o servidor HTTP real
 */
export function createTestApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api', routes);

  return app;
}

