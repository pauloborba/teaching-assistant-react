import { Router } from 'express';
import { Services } from '../services/Services';

/**
 * Routes for the discrepancies between the self-assessment and the
 * professor's grades, and for the discrepancy threshold of a class. Mounted at
 * /api/classes.
 *
 * @param services the domain operations
 * @param onStateChanged called after every successful modification
 */
export function discrepancyRoutes(services: Services, onStateChanged: () => void): Router {
  const router = Router();

  // GET /api/classes/:classId/discrepancies - The discrepant students of a class, and those whose discrepancy cannot be computed
  router.get('/:classId/discrepancies', (req, res) => {
    res.json(services.discrepancies(req.params.classId));
  });

  // PUT /api/classes/:classId/discrepancy-threshold - Change the discrepancy threshold ({ threshold: non-negative integer })
  router.put('/:classId/discrepancy-threshold', (req, res) => {
    const discrepancyThreshold = services.changeDiscrepancyThreshold(req.params.classId, req.body.threshold);
    onStateChanged();
    res.json({ discrepancyThreshold });
  });

  return router;
}
