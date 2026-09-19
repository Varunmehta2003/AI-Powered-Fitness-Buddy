import { Router } from 'express';
import { getWorkout } from '../controllers/workoutController.js';

const router = Router();

// POST /api/workouts
router.post('/', getWorkout);

export default router;
