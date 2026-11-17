import { Router } from 'express';
import { Services } from '../services/Services';
import { isIsoDate } from '../models/Dates';
import { badRequest } from './HttpError';

/**
 * Routes for the self-assessment: the professor's request, and the
 * self-assessment each student submits. Mounted at /api/classes.
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

  // PUT /api/classes/:classId/enrollments/:studentCPF/self-assessment - Submit the self-assessment of a student
  // Body: { grades: { <goal>: 'MANA' | 'MPA' | 'MA' | '' } }; it replaces the previous submission
  router.put('/:classId/enrollments/:studentCPF/self-assessment', (req, res) => {
    const { classId, studentCPF } = req.params;
    const enrollment = services.submitSelfAssessment(studentCPF, classId, req.body.grades);
    onStateChanged();
    res.json(enrollment.toJSON());
  });

  return router;
}
