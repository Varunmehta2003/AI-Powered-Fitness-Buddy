import axios, { AxiosError } from 'axios';
import { config } from '../config/env.js';
import { ConversationMessage, UserContext } from '../types/index.js';

// ── IAM token cache ──────────────────────────────────────────────────────────
let iamToken: string | null = null;
let iamTokenExpiry: number = 0;

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
// Refresh token 5 minutes before expiry
const IAM_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Obtains (or returns cached) IBM Cloud IAM bearer token.
 * Token is cached in-memory and refreshed 5 minutes before expiry.
 * The API key is NEVER logged or exposed.
 */
export async function getIamToken(): Promise<string> {
  const now = Date.now();

  if (iamToken && iamTokenExpiry > now + IAM_REFRESH_MARGIN_MS) {
    return iamToken;
  }

  try {
    const response = await axios.post(
      IAM_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: config.watsonx.apiKey,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15_000,
      }
    );

    const data = response.data as {
      access_token: string;
      expires_in: number;
    };

    iamToken = data.access_token;
    iamTokenExpiry = now + data.expires_in * 1000;

    console.log('[watsonx] IAM token obtained successfully.');
    return iamToken;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    // Log the IBM error code/message (never the key or token)
    const ibmBody = axiosErr.response?.data as Record<string, unknown> | undefined;
    const ibmCode = ibmBody?.['errorCode'] ?? ibmBody?.['errorMessage'] ?? 'unknown';
    console.error(`[Granite Error] IAM token request failed. HTTP ${status ?? 'N/A'}. IBM code: ${String(ibmCode)}`);

    if (status === 400 || status === 401) {
      throw new Error(
        `IBM Cloud IAM authentication failed (HTTP ${status}). ` +
          `Verify WATSONX_API_KEY is a valid, active IBM Cloud API key (should be 44 characters).`
      );
    }
    throw new Error(
      'Failed to obtain IBM Cloud IAM token. Check network connectivity.'
    );
  }
}

// ── Prompt builder ───────────────────────────────────────────────────────────

const FITNESS_BUDDY_SYSTEM_PROMPT = `You are Fitness Buddy, an AI-powered fitness and healthy-lifestyle companion.

Your purpose is to help users improve fitness, nutrition habits, motivation and consistency through simple, practical and personalized guidance.

Personalize responses using the user context provided (fitness goal, experience level, available time, equipment, workout location, dietary preference, previous workout feedback, energy level, recent activity).

Be friendly, concise, practical and nonjudgmental.

Never shame users for missing workouts, eating unhealthy food, losing a streak, or not completing a plan.

Prefer sustainable habits over extreme dieting or exercise.

For workouts provide: title, goal, duration, difficulty, warm-up, exercises with sets/reps or duration and rest, cooldown, and beginner modifications.

For nutrition provide: meal name, ingredients, preparation, approximate nutrition information when useful, and substitutions.

Do not diagnose medical conditions. Do not prescribe medication. Do not claim to treat diseases.

If the user reports severe pain, chest pain, difficulty breathing, fainting, serious injury, or another potentially urgent symptom, recommend appropriate professional medical care.`;

function buildPrompt(
  message: string,
  userContext?: UserContext,
  history?: ConversationMessage[]
): string {
  const contextLines: string[] = [];

  if (userContext) {
    if (userContext.goal) contextLines.push(`Fitness goal: ${userContext.goal.replace(/_/g, ' ')}`);
    if (userContext.fitnessLevel) contextLines.push(`Experience level: ${userContext.fitnessLevel}`);
    if (userContext.durationMinutes)
      contextLines.push(`Available time: ${userContext.durationMinutes} minutes`);
    if (userContext.equipment)
      contextLines.push(`Equipment: ${userContext.equipment.replace(/_/g, ' ')}`);
    if (userContext.location) contextLines.push(`Workout location: ${userContext.location}`);
    if (userContext.diet) contextLines.push(`Diet: ${userContext.diet.replace(/_/g, ' ')}`);
    if (userContext.energyLevel) contextLines.push(`Energy level today: ${userContext.energyLevel}`);
    if (userContext.sorenessLevel)
      contextLines.push(`Soreness: ${userContext.sorenessLevel.replace(/_/g, ' ')}`);
    if (userContext.lastWorkoutFeedback)
      contextLines.push(
        `Last workout feedback: ${userContext.lastWorkoutFeedback.replace(/_/g, ' ')}`
      );
    if (userContext.recentActivity)
      contextLines.push(`Recent activity: ${userContext.recentActivity}`);
  }

  const contextSection =
    contextLines.length > 0 ? `\n\nUser Context:\n${contextLines.join('\n')}` : '';

  const historySection =
    history && history.length > 0
      ? '\n\nConversation History:\n' +
        history
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'User' : 'Fitness Buddy'}: ${m.content}`)
          .join('\n')
      : '';

  // Plain prompt format compatible with Granite instruct models
  return (
    `System: ${FITNESS_BUDDY_SYSTEM_PROMPT}${contextSection}\n\n` +
    `${historySection}\nUser: ${message}\nFitness Buddy:`
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export interface GraniteResponse {
  text: string;
  modelId: string;
}

/**
 * Sends a message to IBM watsonx.ai using the configured Granite model.
 * Authentication is handled via IBM Cloud IAM — credentials never reach the frontend.
 *
 * In development (DEBUG=true) the real IBM error is logged to the console.
 * The frontend always receives a safe, generic error message.
 */
export async function generateGraniteResponse(
  message: string,
  userContext?: UserContext,
  conversationHistory?: ConversationMessage[]
): Promise<GraniteResponse> {
  const token = await getIamToken();

  const prompt = buildPrompt(message, userContext, conversationHistory);

  // API version updated to 2025-05-29 per IBM documentation
  const endpoint = `${config.watsonx.url}/ml/v1/text/generation?version=2025-05-29`;

  const payload = {
    model_id: config.watsonx.modelId,
    input: prompt,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens: 500,   // Reduced from 1024 to avoid timeouts
      min_new_tokens: 1,
      repetition_penalty: 1.05,
      // No stop_sequences — let the model complete naturally.
      // Llama-style tokens (<|user|>) are not valid for all Granite variants.
    },
    project_id: config.watsonx.projectId,
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 90_000,
    });

    const data = response.data as {
      results?: Array<{ generated_text: string }>;
      model_id?: string;
    };

    if (!data.results || data.results.length === 0 || !data.results[0]) {
      throw new Error('Unexpected response format from watsonx.ai — no results array.');
    }

    const generatedText = data.results[0].generated_text?.trim() ?? '';

    return {
      text: generatedText,
      modelId: data.model_id ?? config.watsonx.modelId,
    };
  } catch (err) {
    const axiosErr = err as AxiosError;

    // ── Development diagnostic logging ──────────────────────────────────────
    // Log the real IBM error to the server console.
    // NEVER log Authorization headers, API keys, or tokens.
    const status = axiosErr.response?.status;
    const ibmBody = axiosErr.response?.data as Record<string, unknown> | undefined;
    const ibmErrors = ibmBody?.['errors'] as Array<{ message: string }> | undefined;
    const ibmMessage =
      ibmErrors?.[0]?.message ??
      (ibmBody?.['message'] as string | undefined) ??
      axiosErr.message;

    if (status) {
      console.error(`[Granite Error] HTTP ${status}: ${ibmMessage}`);
    } else if (axiosErr.code === 'ECONNABORTED') {
      console.error('[Granite Error] Request timed out after 90s.');
    } else {
      console.error('[Granite Error]', axiosErr.message);
    }

    // ── Safe user-facing errors ──────────────────────────────────────────────
    if (axiosErr.code === 'ECONNABORTED') {
      throw new Error('Request to IBM watsonx.ai timed out. Please try again.');
    }
    if (status === 401 || status === 403) {
      iamToken = null;
      iamTokenExpiry = 0;
      throw new Error('IBM watsonx.ai authentication failed. Check WATSONX_API_KEY.');
    }
    if (status === 404) {
      throw new Error(
        `IBM watsonx.ai model not found: ${config.watsonx.modelId}. ` +
          `Update WATSONX_MODEL_ID with a model available in your region.`
      );
    }
    if (status === 400) {
      throw new Error(
        `Invalid request to watsonx.ai (HTTP 400). Check WATSONX_MODEL_ID and WATSONX_PROJECT_ID.`
      );
    }
    if (status === 429) {
      throw new Error('IBM watsonx.ai rate limit reached. Please try again in a moment.');
    }
    throw new Error('Fitness Buddy is temporarily unavailable. Please try again.');
  }
}

/**
 * Fetches available foundation models and returns those matching "granite".
 * Used by the test:granite diagnostic script — never called in production.
 */
export async function listGraniteModels(): Promise<
  Array<{ model_id: string; name: string; lifecycle: string }>
> {
  const token = await getIamToken();
  const url = `${config.watsonx.url}/ml/v1/foundation_model_specs?version=2025-05-29`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });

  const resources = (response.data as { resources?: Array<Record<string, unknown>> }).resources ?? [];
  return resources
    .filter((m) => String(m['model_id'] ?? '').toLowerCase().includes('granite'))
    .map((m) => ({
      model_id: String(m['model_id'] ?? ''),
      name: String(m['name'] ?? ''),
      lifecycle: String((m['lifecycle'] as Array<{ id: string }> | undefined)?.[0]?.id ?? 'unknown'),
    }));
}
