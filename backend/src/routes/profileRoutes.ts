import { Router } from 'express';
import {
  fetchProfile,
  createUserProfile,
  updateUserProfile,
} from '../controllers/profileController.js';

const router = Router();

// GET /api/profile?userId=xxx
router.get('/', fetchProfile);

// POST /api/profile
router.post('/', createUserProfile);

// PUT /api/profile/:userId
router.put('/:userId', updateUserProfile);

export default router;
