import { Request, Response, NextFunction } from 'express';
import { getProfile, createProfile, updateProfile } from '../services/profileService.js';
import { createError } from '../middleware/errorHandler.js';

export async function fetchProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.query['userId'] as string) || 'demo';
    const profile = getProfile(userId);

    if (!profile) {
      return next(createError('Profile not found.', 404));
    }

    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function createUserProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const validationError = validateProfileInput(body);
    if (validationError) return next(createError(validationError, 400));

    const profile = createProfile({
      name: String(body['name']),
      goal: body['goal'] as never,
      fitnessLevel: body['fitnessLevel'] as never,
      durationMinutes: Number(body['durationMinutes']),
      equipment: body['equipment'] as never,
      location: body['location'] as never,
      diet: body['diet'] as never,
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function updateUserProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.params['userId'] as string) || 'demo';
    const body = req.body as Record<string, unknown>;

    const updated = updateProfile(userId, body as never);

    if (!updated) {
      return next(createError('Profile not found.', 404));
    }

    res.json({ success: true, profile: updated });
  } catch (err) {
    next(err);
  }
}

const VALID_GOALS = ['weight_management', 'muscle_building', 'general_fitness', 'endurance', 'flexibility'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_EQUIPMENT = ['none', 'dumbbells', 'resistance_bands', 'full_gym', 'other'];
const VALID_LOCATIONS = ['home', 'gym', 'outdoors'];
const VALID_DIETS = ['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian', 'no_preference'];

function validateProfileInput(body: Record<string, unknown>): string | null {
  if (!body['name'] || String(body['name']).trim() === '') return 'name is required.';
  if (!VALID_GOALS.includes(String(body['goal'])))
    return `goal must be one of: ${VALID_GOALS.join(', ')}`;
  if (!VALID_LEVELS.includes(String(body['fitnessLevel'])))
    return `fitnessLevel must be one of: ${VALID_LEVELS.join(', ')}`;
  const dur = Number(body['durationMinutes']);
  if (isNaN(dur) || dur < 10 || dur > 120)
    return 'durationMinutes must be between 10 and 120.';
  if (!VALID_EQUIPMENT.includes(String(body['equipment'])))
    return `equipment must be one of: ${VALID_EQUIPMENT.join(', ')}`;
  if (!VALID_LOCATIONS.includes(String(body['location'])))
    return `location must be one of: ${VALID_LOCATIONS.join(', ')}`;
  if (!VALID_DIETS.includes(String(body['diet'])))
    return `diet must be one of: ${VALID_DIETS.join(', ')}`;
  return null;
}
