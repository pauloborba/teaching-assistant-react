import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import examsRoutes from "./exams";
import correctionRoutes from "./correction";
import examPdfRoutes from './examPdf'
import questionsRoutes from './questions';

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);


// Question bank routes
router.use('/questions', questionsRoutes);

// Question bank routes
router.use('/questions', questionsRoutes);

// Exams routes
router.use('/exams', examsRoutes);
router.use(correctionRoutes);
router.use('/exams', examPdfRoutes);

export default router;

