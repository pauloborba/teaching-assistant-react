import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import examsRoutes from "./exams";
import correctionRoutes from "./correction";
import examPdfRoutes from './examPdf'

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);


// Exams routes (v1)
router.use('/v1/exams', examsRoutes);
router.use(correctionRoutes);
router.use('/v1/exams', examPdfRoutes);

export default router;

