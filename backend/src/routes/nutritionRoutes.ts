import { Router } from 'express';
import { getNutrition } from '../controllers/nutritionController.js';

const router = Router();

// POST /api/nutrition
router.post('/', getNutrition);

export default router;
