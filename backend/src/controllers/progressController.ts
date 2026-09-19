import { Request, Response, NextFunction } from 'express';
import { getProgress, completeWorkout } from '../services/progressService.js';
import { WorkoutFeedback } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function fetchProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.query['userId'] as string) || 'demo';
    const progress = getProgress(userId);
    res.json({ success: true, progress });
  } catch (err) {
    next(err);
  }
}

export async function markWorkoutComplete(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as {
      userId?: string;
      title?: string;
      durationMinutes?: number;
      feedback?: WorkoutFeedback;
      notes?: string;
    };

    const validFeedback: WorkoutFeedback[] = ['too_easy', 'perfect', 'too_hard', 'not_completed'];

    const userId = body.userId || 'demo';
    const title = body.title || "Today's Workout";
    const durationMinutes = body.durationMinutes || 30;

    if (!body.feedback || !validFeedback.includes(body.feedback)) {
      return next(
        createError(
          `feedback must be one of: ${validFeedback.join(', ')}`,
          400
        )
      );
    }

    const completed = completeWorkout(
      userId,
      title,
      durationMinutes,
      body.feedback,
      body.notes
    );

    const progress = getProgress(userId);

    res.json({
      success: true,
      message: getCompletionMessage(body.feedback),
      workout: completed,
      streak: progress.currentStreak,
    });
  } catch (err) {
    next(err);
  }
}

function getCompletionMessage(feedback: WorkoutFeedback): string {
  switch (feedback) {
    case 'too_easy':
      return "Great job! You crushed it 💪 We'll step it up next time.";
    case 'perfect':
      return 'Great job! Another workout completed 💪 Keep it up!';
    case 'too_hard':
      return "Great job for pushing through 💪 We'll adjust the next one.";
    case 'not_completed':
      return "That's okay — every effort counts. We'll try a lighter session next time.";
  }
}
