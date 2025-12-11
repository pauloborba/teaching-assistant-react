import { Router, Request, Response } from 'express';
import { studentSet, classes } from '../services/dataService';

const router = Router();

/**
 * GET /api/stats
 * Get statistics about students and classes
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const students = studentSet.getAllStudents();
    const allClasses = classes.getAllClasses();
    
    res.json({
      students: {
        total: students.length
      },
      classes: {
        total: allClasses.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

