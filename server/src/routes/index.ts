import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import examsRoutes from "./exams";

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);


// Exams routes
router.use('/exams', examsRoutes);

export default router;

