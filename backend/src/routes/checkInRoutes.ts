import { Router } from 'express';
import { checkIn } from '../controllers/checkInController.js';

const router = Router();

// POST /api/checkin
router.post('/', checkIn);

export default router;
