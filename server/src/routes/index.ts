import { Router } from 'express';
import healthRoutes from './health';

const router = Router();

// Health check routes
router.use(healthRoutes);

export default router;

