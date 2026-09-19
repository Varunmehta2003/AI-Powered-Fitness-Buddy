import { Request, Response, NextFunction } from 'express';
import { generateNutrition } from '../services/chatService.js';
import { UserContext } from '../types/index.js';

export async function getNutrition(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as { userContext?: UserContext; mealType?: string };
    const userContext: UserContext = body.userContext ?? {};
    const mealType = body.mealType ?? 'full_day';

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'full_day'];
    if (!validMealTypes.includes(mealType)) {
      res.status(400).json({ success: false, error: 'Invalid mealType.' });
      return;
    }

    const nutritionText = await generateNutrition(userContext, mealType);

    res.json({
      success: true,
      rawMessage: nutritionText,
      plan: parseMealsFromText(nutritionText, mealType),
    });
  } catch (err) {
    next(err);
  }
}

function parseMealsFromText(
  text: string,
  mealType: string
): Record<string, object | string> | null {
  try {
    if (mealType !== 'full_day') {
      return {
        [mealType]: {
          name: extractMealName(text),
          description: text.split('\n').slice(0, 5).join(' '),
        },
      };
    }

    const sections: Record<string, string> = {};
    const mealPatterns = [
      { key: 'breakfast', pattern: /breakfast[:\s]*([^]*?)(?=\n(?:lunch|dinner|snack)|$)/i },
      { key: 'lunch', pattern: /lunch[:\s]*([^]*?)(?=\n(?:breakfast|dinner|snack)|$)/i },
      { key: 'dinner', pattern: /dinner[:\s]*([^]*?)(?=\n(?:breakfast|lunch|snack)|$)/i },
      { key: 'snack', pattern: /snack[:\s]*([^]*?)(?=\n(?:breakfast|lunch|dinner)|$)/i },
    ];

    for (const { key, pattern } of mealPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        sections[key] = match[1].trim().slice(0, 500);
      }
    }

    return Object.keys(sections).length > 0 ? sections : null;
  } catch {
    return null;
  }
}

function extractMealName(text: string): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 3);
  return firstLine?.replace(/[-•*#]\s*/, '').trim() ?? 'Meal suggestion';
}
