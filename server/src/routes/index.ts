import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import examPdfRoutes from './examPdf'

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);

router.use('/exams', examPdfRoutes);

export default router;

