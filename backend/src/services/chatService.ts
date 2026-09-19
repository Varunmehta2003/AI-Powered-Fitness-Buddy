import { generateGraniteResponse } from './watsonxService.js';
import { sendToOrchestrate } from './orchestrateService.js';
import {
  ChatRequest,
  ChatResponse,
  UserContext,
  ConversationMessage,
} from '../types/index.js';

/**
 * Primary chat handler.
 * Tries Orchestrate first (routes to specialist agents).
 * Falls back to direct Granite call if Orchestrate is unavailable.
 */
export async function handleChat(
  request: ChatRequest,
  sessionId?: string
): Promise<ChatResponse> {
  const { message, userContext, conversationHistory } = request;

  // Attempt Orchestrate first — uses existing Phase 2 agents
  const orchestrateResult = await sendToOrchestrate(
    message,
    userContext,
    conversationHistory,
    sessionId
  );

  if (orchestrateResult.success) {
    return {
      success: true,
      message: orchestrateResult.message,
      source: 'orchestrate',
      specialist: orchestrateResult.specialist,
    };
  }

  // Fallback: direct IBM Granite call via watsonx.ai
  console.log('[Chat] Orchestrate unavailable, falling back to Granite:', orchestrateResult.message);

  const graniteResult = await generateGraniteResponse(message, userContext, conversationHistory);

  return {
    success: true,
    message: graniteResult.text,
    source: 'watsonx',
    specialist: undefined,
  };
}

/**
 * Generate a focused workout plan using Granite.
 */
export async function generateWorkout(userContext: UserContext): Promise<string> {
  const workoutPrompt = buildWorkoutPrompt(userContext);
  const result = await generateGraniteResponse(workoutPrompt, userContext, []);
  return result.text;
}

/**
 * Generate a nutrition plan using Granite.
 */
export async function generateNutrition(
  userContext: UserContext,
  mealType: string = 'full_day'
): Promise<string> {
  const nutritionPrompt = buildNutritionPrompt(userContext, mealType);
  const result = await generateGraniteResponse(nutritionPrompt, userContext, []);
  return result.text;
}

/**
 * Process daily check-in through Orchestrate daily check-in specialist,
 * with Granite fallback.
 */
export async function processCheckIn(
  energyLevel: string,
  sorenessLevel: string,
  availableMinutes: number,
  userContext?: UserContext
): Promise<{ recommendation: string; message: string; reasoning: string }> {
  const checkInMessage =
    `Daily check-in: Energy level is ${energyLevel}, soreness is ${sorenessLevel.replace(/_/g, ' ')}, ` +
    `available time is ${availableMinutes} minutes. ` +
    `Based on this, what workout should I do today? Please recommend one of: ` +
    `normal workout, light workout, mobility session, active recovery, or rest day. ` +
    `Explain why briefly.`;

  const orchestrateResult = await sendToOrchestrate(checkInMessage, userContext);

  const responseText = orchestrateResult.success
    ? orchestrateResult.message
    : (await generateGraniteResponse(checkInMessage, userContext, [])).text;

  const recommendation = inferRecommendation(energyLevel, sorenessLevel, availableMinutes);

  return {
    recommendation,
    message: responseText,
    reasoning: extractReasoning(responseText),
  };
}

function inferRecommendation(
  energy: string,
  soreness: string,
  minutes: number
): string {
  if (soreness === 'very_sore' || energy === 'low') {
    return minutes <= 10 ? 'rest' : 'active_recovery';
  }
  if (soreness === 'slightly_sore' && energy === 'low') {
    return 'mobility';
  }
  if (energy === 'medium' && soreness === 'slightly_sore') {
    return minutes >= 30 ? 'light_workout' : 'mobility';
  }
  if (energy === 'high' && soreness === 'not_sore') {
    return 'normal_workout';
  }
  return minutes >= 20 ? 'light_workout' : 'mobility';
}

function extractReasoning(text: string): string {
  // Return first 200 chars as reasoning snippet
  const sentences = text.split(/[.!?]/);
  return sentences.slice(0, 2).join('. ').trim();
}

function buildWorkoutPrompt(ctx: UserContext): string {
  const duration = ctx.durationMinutes ?? 30;
  const level = ctx.fitnessLevel ?? 'beginner';
  const equipment = ctx.equipment ?? 'none';
  const location = ctx.location ?? 'home';
  const goal = ctx.goal ?? 'general_fitness';
  const feedback = ctx.lastWorkoutFeedback;

  let adaptNote = '';
  if (feedback === 'too_easy') adaptNote = ' The last workout was too easy, so increase difficulty slightly.';
  else if (feedback === 'too_hard') adaptNote = ' The last workout was too hard, so reduce volume or use easier variations.';
  else if (feedback === 'not_completed') adaptNote = ' The user could not complete the last workout, so make this one shorter and more achievable.';

  return (
    `Create a complete ${duration}-minute ${level} ${goal.replace(/_/g, ' ')} workout ` +
    `for someone at ${location} with ${equipment.replace(/_/g, ' ')} equipment.` +
    adaptNote +
    ` Include: warm-up, exercises with sets/reps or duration and rest periods, cooldown, and beginner modifications.`
  );
}

function buildNutritionPrompt(ctx: UserContext, mealType: string): string {
  const diet = ctx.diet ?? 'no_preference';
  const goal = ctx.goal ?? 'general_fitness';

  if (mealType === 'full_day') {
    return (
      `Suggest a full day of healthy meals (breakfast, lunch, dinner, and one snack) ` +
      `for someone with a ${diet.replace(/_/g, ' ')} diet and a goal of ${goal.replace(/_/g, ' ')}. ` +
      `For each meal include: meal name, ingredients, brief preparation steps, approximate nutrition, and substitutions.`
    );
  }

  return (
    `Suggest a healthy ${mealType} for someone with a ${diet.replace(/_/g, ' ')} diet ` +
    `and a goal of ${goal.replace(/_/g, ' ')}. ` +
    `Include: meal name, ingredients, brief preparation steps, approximate nutrition, and substitutions.`
  );
}

export { ConversationMessage };
