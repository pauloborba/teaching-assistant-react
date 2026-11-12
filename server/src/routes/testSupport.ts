import { Router } from 'express';
import { SettableClock } from '../services/Clock';
import { isIsoDate } from '../models/Dates';
import { badRequest } from './HttpError';

/**
 * Routes that exist only for the acceptance tests, mounted at /api/test when
 * the server is started for them (see index.ts). Never available otherwise.
 *
 * @param clock the clock whose date the tests fix
 */
export function testSupportRoutes(clock: SettableClock): Router {
  const router = Router();

  // PUT /api/test/clock - Fix the date the server takes as today ({ today: 'yyyy-mm-dd' }), or null for the real date
  router.put('/clock', (req, res) => {
    const { today } = req.body;
    if (today !== null && !isIsoDate(today)) {
      throw badRequest('Today must be a date in the format yyyy-mm-dd, or null');
    }
    clock.set(today);
    res.status(204).send();
  });

  return router;
}
