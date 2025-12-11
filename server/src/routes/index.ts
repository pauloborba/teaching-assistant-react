import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import examsRoutes from "./exams";
import correctionRoutes from "./correction";
import triggerAICorrectionRoutes from './trigger-ai-correction';
import questionAICorrectionRoutes from './question-ai-correction';
import questionsRoutes from './questions';

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);


// Question bank routes
router.use('/questions', questionsRoutes);

// Exams routes
router.use('/exams', examsRoutes);
router.use(correctionRoutes);

// AI Correction routes
router.use(triggerAICorrectionRoutes);
router.use(questionAICorrectionRoutes);

export default router;

