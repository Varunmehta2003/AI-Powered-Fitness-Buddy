import { Router } from 'express';
import { fetchProgress, markWorkoutComplete } from '../controllers/progressController.js';

const router = Router();

// GET /api/progress?userId=xxx
router.get('/', fetchProgress);

// POST /api/progress/complete-workout
router.post('/complete-workout', markWorkoutComplete);

export default router;
