import { Router } from 'express';
import { chat } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat
router.post('/', chat);

export default router;
