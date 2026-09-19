import { Request, Response, NextFunction } from 'express';
import { generateWorkout } from '../services/chatService.js';
import { UserContext } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function getWorkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { userContext?: UserContext };
    const userContext: UserContext = body.userContext ?? {};

    const workoutText = await generateWorkout(userContext);

    res.json({
      success: true,
      rawMessage: workoutText,
      workout: parseWorkoutFromText(workoutText),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Best-effort parser: extracts structured workout data from Granite's text output.
 * If parsing fails, the rawMessage is still returned for display.
 */
function parseWorkoutFromText(text: string): object | null {
  try {
    // Extract title
    const titleMatch = text.match(/(?:workout title|title)[:\s]+([^\n]+)/i);
    const title = titleMatch?.[1]?.trim() ?? extractFirstLine(text);

    // Extract duration
    const durationMatch = text.match(/(\d+)\s*(?:minute|min)/i);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1]!, 10) : 30;

    // Extract difficulty
    const difficultyMatch = text.match(/\b(beginner|intermediate|advanced)\b/i);
    const difficulty = (difficultyMatch?.[1]?.toLowerCase() ?? 'beginner') as
      | 'beginner'
      | 'intermediate'
      | 'advanced';

    // Extract exercises (lines with sets/reps pattern)
    const exerciseLines = text
      .split('\n')
      .filter(
        (line) =>
          /\d+\s*x\s*\d+|sets?|reps?|seconds?|minute/i.test(line) &&
          line.trim().length > 5
      )
      .map((line) => ({
        name: line.replace(/[-•*]\s*/, '').split(':')[0]?.trim() ?? line.trim(),
        setsReps: extractSetsReps(line),
        instructions: line.trim(),
        rest: extractRest(line),
      }))
      .slice(0, 10);

    // Extract warm-up section
    const warmUpMatch = text.match(/warm[\s-]?up[:\s]*([^]*?)(?=\nexercise|\ncooldown|\nmain|$)/i);
    const warmUp = warmUpMatch
      ? warmUpMatch[1]
          .split('\n')
          .map((l) => l.replace(/[-•*]\s*/, '').trim())
          .filter((l) => l.length > 2)
          .slice(0, 5)
      : ['Light cardio 3-5 minutes', 'Dynamic stretching'];

    // Extract cooldown section
    const coolDownMatch = text.match(/cooldown?[:\s]*([^]*?)(?=\n[A-Z]|$)/i);
    const coolDown = coolDownMatch
      ? coolDownMatch[1]
          .split('\n')
          .map((l) => l.replace(/[-•*]\s*/, '').trim())
          .filter((l) => l.length > 2)
          .slice(0, 4)
      : ['Static stretching 3-5 minutes', 'Deep breathing'];

    return {
      title,
      durationMinutes,
      difficulty,
      goal: '',
      warmUp,
      exercises: exerciseLines.length > 0 ? exerciseLines : [],
      coolDown,
    };
  } catch {
    return null;
  }
}

function extractFirstLine(text: string): string {
  return text.split('\n').find((l) => l.trim().length > 3)?.trim() ?? 'Today\'s Workout';
}

function extractSetsReps(line: string): string {
  const match = line.match(/(\d+\s*x\s*\d+|\d+\s*sets?\s*(?:of\s*)?\d+\s*reps?|\d+\s*seconds?)/i);
  return match?.[0]?.trim() ?? '';
}

function extractRest(line: string): string {
  const match = line.match(/rest[:\s]+([^,\n]+)/i);
  return match?.[1]?.trim() ?? '';
}

export { createError };
