import { Router } from 'express';
import { Services } from '../services/Services';
import { isIsoDate } from '../models/Dates';
import { badRequest } from './HttpError';

/**
 * Routes for the self-assessment: the professor's request, and the grades
 * each student assigns to themselves. Mounted at /api/classes.
 *
 * @param services the domain operations
 * @param onStateChanged called after every successful modification
 */
export function selfAssessmentRoutes(services: Services, onStateChanged: () => void): Router {
  const router = Router();

  // POST /api/classes/:classId/self-assessment-request - Request the self-assessment of a class
  router.post('/:classId/self-assessment-request', (req, res) => {
    const { deadline } = req.body;
    if (!isIsoDate(deadline)) {
      throw badRequest('Deadline must be a date in the format yyyy-mm-dd');
    }
    const request = services.requestSelfAssessment(req.params.classId, deadline);
    onStateChanged();
    res.status(201).json(request.toJSON());
  });

  // DELETE /api/classes/:classId/self-assessment-request - Withdraw the self-assessment request
  router.delete('/:classId/self-assessment-request', (req, res) => {
    services.cancelSelfAssessmentRequest(req.params.classId);
    onStateChanged();
    res.status(204).send();
  });

  // PUT /api/classes/:classId/enrollments/:studentCPF/self-assessment/:goal - Set a self-assessment grade
  router.put('/:classId/enrollments/:studentCPF/self-assessment/:goal', (req, res) => {
    const { classId, studentCPF, goal } = req.params;
    const enrollment = services.setSelfAssessment(studentCPF, classId, goal, req.body.grade);
    onStateChanged();
    res.json(enrollment.toJSON());
  });

  // DELETE /api/classes/:classId/enrollments/:studentCPF/self-assessment/:goal - Remove a self-assessment grade
  router.delete('/:classId/enrollments/:studentCPF/self-assessment/:goal', (req, res) => {
    const { classId, studentCPF, goal } = req.params;
    const enrollment = services.removeSelfAssessment(studentCPF, classId, goal);
    onStateChanged();
    res.json(enrollment.toJSON());
  });

  return router;
}
