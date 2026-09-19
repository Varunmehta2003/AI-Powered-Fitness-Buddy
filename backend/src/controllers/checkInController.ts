import { Request, Response, NextFunction } from 'express';
import { processCheckIn } from '../services/chatService.js';
import { CheckInRequest, EnergyLevel, SorenessLevel } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Partial<CheckInRequest>;

    const validEnergy: EnergyLevel[] = ['low', 'medium', 'high'];
    const validSoreness: SorenessLevel[] = ['not_sore', 'slightly_sore', 'very_sore'];
    const validMinutes = [10, 20, 30, 45];

    if (!body.energyLevel || !validEnergy.includes(body.energyLevel)) {
      return next(
        createError(
          `energyLevel must be one of: ${validEnergy.join(', ')}`,
          400
        )
      );
    }

    if (!body.sorenessLevel || !validSoreness.includes(body.sorenessLevel)) {
      return next(
        createError(
          `sorenessLevel must be one of: ${validSoreness.join(', ')}`,
          400
        )
      );
    }

    if (!body.availableMinutes || !validMinutes.includes(body.availableMinutes)) {
      return next(
        createError(
          `availableMinutes must be one of: ${validMinutes.join(', ')}`,
          400
        )
      );
    }

    const result = await processCheckIn(
      body.energyLevel,
      body.sorenessLevel,
      body.availableMinutes
    );

    res.json({
      success: true,
      recommendation: result.recommendation,
      message: result.message,
      reasoning: result.reasoning,
    });
  } catch (err) {
    next(err);
  }
}
