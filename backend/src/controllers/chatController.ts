import { Request, Response, NextFunction } from 'express';
import { handleChat } from '../services/chatService.js';
import { ChatRequest } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Partial<ChatRequest>;

    if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
      return next(createError('message is required and must be a non-empty string.', 400));
    }

    if (body.message.length > 2000) {
      return next(createError('message must not exceed 2000 characters.', 400));
    }

    const sessionId = req.headers['x-session-id'] as string | undefined;

    const result = await handleChat(
      {
        message: body.message.trim(),
        userContext: body.userContext,
        conversationHistory: body.conversationHistory ?? [],
      },
      sessionId
    );

    res.json(result);
  } catch (err) {
    // Log the real error on the server so it's visible during development.
    // The centralized errorHandler will send only a safe message to the client.
    console.error('[Chat] Error:', (err as Error).message);
    next(err);
  }
}
