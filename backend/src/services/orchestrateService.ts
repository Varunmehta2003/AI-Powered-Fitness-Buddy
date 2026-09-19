import axios, { AxiosError } from 'axios';
import { config } from '../config/env.js';
import { UserContext, ConversationMessage } from '../types/index.js';

/**
 * IBM watsonx Orchestrate Integration Service
 *
 * Connects to the EXISTING Fitness Buddy Primary Agent (Phase 2).
 * Does NOT recreate any agents.
 *
 * ── Confirmed working API (verified by live probing) ──────────────────────────
 *
 * Authentication:
 *   Exchange ORCHESTRATE_API_KEY for an IBM Cloud IAM bearer token via:
 *   POST https://iam.cloud.ibm.com/identity/token
 *   Never use the raw API key as a Bearer token.
 *
 * Agent discovery (management API):
 *   GET  {ORCHESTRATE_URL}/v1/orchestrate/agents
 *   GET  {ORCHESTRATE_URL}/v1/orchestrate/agents/{agentId}
 *
 * ── Run API (execution — the correct server-to-server mechanism) ──────────────
 *
 *   POST {ORCHESTRATE_URL}/v1/orchestrate/runs
 *   Body: { agent_id, message: { role: 'user', content: '...' } }
 *   Response: { run_id, thread_id, task_id, message_id, trace_id }
 *
 *   GET  {ORCHESTRATE_URL}/v1/orchestrate/runs/{run_id}
 *   Response: { id, status: 'running'|'completed'|'failed'|'cancelled', ... }
 *   Poll until status is terminal.
 *
 *   GET  {ORCHESTRATE_URL}/v1/orchestrate/threads/{thread_id}/messages
 *   Response: message[] — includes assistant reply once run is completed.
 *
 * ── Why NOT thread/message polling ───────────────────────────────────────────
 *   POST /v1/orchestrate/threads + POST /v1/orchestrate/threads/{id}/messages
 *   stores the message in a thread but does NOT trigger agent execution.
 *   The agent only executes when a run is created via POST /v1/orchestrate/runs.
 *
 * ── Why NOT A2A JSON-RPC ──────────────────────────────────────────────────────
 *   The A2A endpoint at /v1/orchestrate/A2A/{agentId} returns 404 for all
 *   JSON-RPC methods for native WxO agents. A2A is only available for
 *   externally-registered (non-native) agents in this tenant.
 *
 * Required environment variables:
 *   ORCHESTRATE_URL         - Service instance base URL
 *                             e.g. https://api.jp-tok.watson-orchestrate.cloud.ibm.com/instances/<tenant-id>
 *   ORCHESTRATE_API_KEY     - IBM Cloud API key (exchanged for IAM token at runtime)
 *   ORCHESTRATE_AGENT_ID    - Agent ID of "Fitness Buddy - Primary Agent"
 *   ORCHESTRATE_ENVIRONMENT - 'draft' or 'live' (informational; execution requires live)
 */

// ── IAM token cache ────────────────────────────────────────────────────────────

let orchestrateIamToken: string | null = null;
let orchestrateIamExpiry = 0;
const IAM_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Exchange ORCHESTRATE_API_KEY for an IBM Cloud IAM bearer token.
 * Cached in-memory with automatic refresh. The key is never logged.
 */
export async function getOrchestrateAccessToken(): Promise<string> {
  const now = Date.now();
  if (orchestrateIamToken && orchestrateIamExpiry > now + IAM_REFRESH_MARGIN_MS) {
    return orchestrateIamToken;
  }

  const response = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: config.orchestrate.apiKey,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    }
  );

  const data = response.data as { access_token: string; expires_in: number };
  orchestrateIamToken = data.access_token;
  orchestrateIamExpiry = now + data.expires_in * 1000;
  return orchestrateIamToken;
}

/** Returns true when all three required Orchestrate env vars are present. */
export function isOrchestrateConfigured(): boolean {
  return !!(
    config.orchestrate.url &&
    config.orchestrate.apiKey &&
    config.orchestrate.agentId
  );
}

// ── Agent discovery (management API) ──────────────────────────────────────────

export interface AgentRecord {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  environments?: Array<{ id: string; name: string; current_version: number | null }>;
}

export interface RunRecord {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'error';
  thread_id: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  last_error: string | null;
}

/** Lists all agents in the Orchestrate instance. */
export async function discoverAgents(): Promise<AgentRecord[]> {
  const token = await getOrchestrateAccessToken();
  const response = await axios.get(`${config.orchestrate.url}/v1/orchestrate/agents`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 15_000,
  });
  return (response.data as AgentRecord[]) ?? [];
}

/** Fetches full details for one agent. Returns null if not found (404). */
export async function getAgentDetails(agentId: string): Promise<AgentRecord | null> {
  const token = await getOrchestrateAccessToken();
  try {
    const response = await axios.get(
      `${config.orchestrate.url}/v1/orchestrate/agents/${agentId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, timeout: 15_000 }
    );
    return response.data as AgentRecord;
  } catch (err) {
    if ((err as AxiosError).response?.status === 404) return null;
    throw err;
  }
}

/** Returns true if the agent has a published live environment (current_version !== null). */
export function agentHasLiveEnvironment(agent: AgentRecord): boolean {
  return (
    agent.environments?.some(
      (e) => e.name === 'live' && e.current_version !== null
    ) ?? false
  );
}

// ── Run API (execution) ────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'error']);
// Poll every 2 seconds, give up after 90 seconds
const POLL_INTERVAL_MS = 2_000;
const RUN_TIMEOUT_MS = 90_000;

interface StartRunResult {
  run_id: string;
  thread_id: string;
  task_id: string;
  message_id: string;
}

/**
 * Creates a new run by posting to POST /v1/orchestrate/runs.
 * This is the only endpoint that triggers agent execution.
 * Body: { agent_id, message: { role: 'user', content: '...' } }
 */
async function startRun(token: string, agentId: string, content: string): Promise<StartRunResult> {
  const response = await axios.post(
    `${config.orchestrate.url}/v1/orchestrate/runs`,
    { agent_id: agentId, message: { role: 'user', content } },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 20_000,
    }
  );

  const data = response.data as StartRunResult;
  console.log(
    `[Orchestrate] Run started. run_id=${data.run_id} thread_id=${data.thread_id}`
  );
  return data;
}

/**
 * Polls GET /v1/orchestrate/runs/{run_id} until the run reaches a terminal status
 * (completed, failed, cancelled) or the timeout is exceeded.
 * Returns the final RunRecord.
 */
async function waitForRun(token: string, runId: string): Promise<RunRecord> {
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  let lastStatus = 'running';
  let attempts = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;

    const response = await axios.get(
      `${config.orchestrate.url}/v1/orchestrate/runs/${runId}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 15_000,
      }
    );

    const run = response.data as RunRecord;
    lastStatus = run.status;

    if (attempts % 5 === 0 || TERMINAL_STATUSES.has(run.status)) {
      console.log(`[Orchestrate] Run ${runId} status=${run.status} (attempt ${attempts})`);
    }

    if (TERMINAL_STATUSES.has(run.status)) {
      return run;
    }
  }

  // Timed out
  const timeoutRun: RunRecord = {
    id: runId,
    status: 'error',
    thread_id: '',
    started_at: null,
    completed_at: null,
    failed_at: null,
    last_error: `Run did not complete within ${RUN_TIMEOUT_MS / 1000}s. Last status: ${lastStatus}`,
  };
  return timeoutRun;
}

/**
 * Reads the assistant's reply from a completed thread.
 * Returns the text content or null if no assistant message is found.
 */
async function readAssistantReply(token: string, threadId: string): Promise<string | null> {
  const response = await axios.get(
    `${config.orchestrate.url}/v1/orchestrate/threads/${threadId}/messages`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 15_000,
    }
  );

  const messages = response.data as Array<{
    id: string;
    role: string;
    content: Array<{ response_type?: string; text?: string }> | string;
  }>;

  const assistantMsgs = messages.filter((m) => m.role === 'assistant');
  if (assistantMsgs.length === 0) return null;

  // Take the last (most recent) assistant message
  const latest = assistantMsgs[assistantMsgs.length - 1]!;

  if (Array.isArray(latest.content)) {
    const text = latest.content
      .filter((c) => c.response_type === 'text' || c.text)
      .map((c) => c.text ?? '')
      .join('\n')
      .trim();
    return text || null;
  }

  if (typeof latest.content === 'string' && latest.content.trim()) {
    return latest.content.trim();
  }

  return null;
}

// ── Context helpers ────────────────────────────────────────────────────────────

function buildEnrichedMessage(message: string, userContext?: UserContext): string {
  const parts: string[] = [];
  if (userContext?.goal) parts.push(`Goal: ${userContext.goal.replace(/_/g, ' ')}`);
  if (userContext?.fitnessLevel) parts.push(`Level: ${userContext.fitnessLevel}`);
  if (userContext?.durationMinutes)
    parts.push(`Time available: ${userContext.durationMinutes} min`);
  if (userContext?.equipment)
    parts.push(`Equipment: ${userContext.equipment.replace(/_/g, ' ')}`);
  if (userContext?.location) parts.push(`Location: ${userContext.location}`);
  if (userContext?.diet) parts.push(`Diet: ${userContext.diet.replace(/_/g, ' ')}`);
  if (userContext?.energyLevel) parts.push(`Energy: ${userContext.energyLevel}`);
  if (userContext?.sorenessLevel)
    parts.push(`Soreness: ${userContext.sorenessLevel.replace(/_/g, ' ')}`);
  if (userContext?.lastWorkoutFeedback)
    parts.push(
      `Last workout feedback: ${userContext.lastWorkoutFeedback.replace(/_/g, ' ')}`
    );
  return parts.length > 0 ? `${message}\n\n[User Context: ${parts.join(', ')}]` : message;
}

function detectSpecialist(message: string): string {
  if (/(workout|exercise|train|push.?up|squat|cardio|run|strength)/i.test(message))
    return 'workout';
  if (/(meal|food|eat|diet|nutrition|recipe|breakfast|lunch|dinner|snack)/i.test(message))
    return 'nutrition';
  if (/(motivat|discourage|give up|lazy|tired of|can.?t|cannot)/i.test(message))
    return 'motivation';
  if (/(habit|routine|streak|consistent|schedule|daily)/i.test(message)) return 'habit';
  if (/(check.?in|today|energy|sore|how am|feel)/i.test(message)) return 'checkin';
  return 'primary';
}

// ── Public interface ───────────────────────────────────────────────────────────

export interface OrchestrateResult {
  success: boolean;
  message: string;
  specialist?: string;
  /** 'SUCCESS' | 'AGENT_EXECUTION_ERROR' | 'API_ERROR' | 'TIMEOUT' | 'NOT_CONFIGURED' */
  outcome?: string;
}

/**
 * Sends a message to the Fitness Buddy Primary Agent and returns the response.
 *
 * Execution flow (confirmed against live tenant):
 *   1. Exchange API key for IAM bearer token
 *   2. POST /v1/orchestrate/runs  → { run_id, thread_id }
 *   3. GET  /v1/orchestrate/runs/{run_id}  → poll until completed/failed
 *   4. GET  /v1/orchestrate/threads/{thread_id}/messages  → read assistant reply
 *
 * Falls back gracefully to Granite when Orchestrate is not configured or unavailable.
 */
export async function sendToOrchestrate(
  message: string,
  userContext?: UserContext,
  _conversationHistory?: ConversationMessage[],
  _sessionId?: string
): Promise<OrchestrateResult> {
  if (!isOrchestrateConfigured()) {
    return {
      success: false,
      outcome: 'NOT_CONFIGURED',
      message:
        'IBM watsonx Orchestrate is not configured. ' +
        'Set ORCHESTRATE_URL, ORCHESTRATE_API_KEY, and ORCHESTRATE_AGENT_ID in backend/.env.',
    };
  }

  // ── Step 1: IAM token ──────────────────────────────────────────────────────
  let token: string;
  try {
    token = await getOrchestrateAccessToken();
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const ibmBody = axiosErr.response?.data as Record<string, unknown> | undefined;
    const ibmCode = String(
      ibmBody?.['errorCode'] ?? ibmBody?.['errorMessage'] ?? axiosErr.message
    );
    console.error(`[Orchestrate] IAM token failed. HTTP ${status ?? 'N/A'}: ${ibmCode}`);
    return {
      success: false,
      outcome: 'API_ERROR',
      message:
        status === 400 || status === 401
          ? 'Orchestrate authentication failed. Verify ORCHESTRATE_API_KEY is a valid IBM Cloud API key.'
          : 'Orchestrate is temporarily unavailable. Please try again.',
    };
  }

  // ── Step 2: Start run ──────────────────────────────────────────────────────
  let runResult: StartRunResult;
  try {
    const enrichedMessage = buildEnrichedMessage(message, userContext);
    runResult = await startRun(token, config.orchestrate.agentId, enrichedMessage);
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const ibmBody = axiosErr.response?.data as Record<string, unknown> | undefined;
    const ibmMsg =
      (ibmBody?.['detail'] as string | undefined) ??
      (ibmBody?.['message'] as string | undefined) ??
      axiosErr.message;
    console.error(`[Orchestrate] Failed to start run. HTTP ${status ?? 'N/A'}: ${ibmMsg}`);

    if (axiosErr.code === 'ECONNABORTED') {
      return { success: false, outcome: 'TIMEOUT', message: 'Orchestrate request timed out.' };
    }
    if (status === 401 || status === 403) {
      orchestrateIamToken = null;
      return {
        success: false,
        outcome: 'API_ERROR',
        message: 'Orchestrate authentication failed. Verify ORCHESTRATE_API_KEY.',
      };
    }
    if (status === 404) {
      return {
        success: false,
        outcome: 'API_ERROR',
        message: `Orchestrate agent not found (${config.orchestrate.agentId}). Verify ORCHESTRATE_AGENT_ID.`,
      };
    }
    return {
      success: false,
      outcome: 'API_ERROR',
      message: 'Fitness Buddy is temporarily unavailable. Please try again.',
    };
  }

  // ── Step 3: Poll run to completion ─────────────────────────────────────────
  let completedRun: RunRecord;
  try {
    completedRun = await waitForRun(token, runResult.run_id);
  } catch (err) {
    const axiosErr = err as AxiosError;
    console.error(`[Orchestrate] Run polling failed: ${axiosErr.message}`);
    return {
      success: false,
      outcome: 'API_ERROR',
      message: 'Fitness Buddy is temporarily unavailable. Please try again.',
    };
  }

  // ── Step 4: Handle terminal run state ─────────────────────────────────────
  if (completedRun.status === 'error' && completedRun.last_error?.includes('did not complete')) {
    console.error(
      `[Orchestrate] Run timed out. run_id=${runResult.run_id} thread_id=${runResult.thread_id}`
    );
    return {
      success: false,
      outcome: 'TIMEOUT',
      message: 'Fitness Buddy took too long to respond. Please try again.',
    };
  }

  if (completedRun.status === 'failed' || completedRun.status === 'cancelled') {
    const reason = completedRun.last_error ?? completedRun.status;
    console.error(
      `[Orchestrate] Run ${completedRun.status}. run_id=${runResult.run_id} error=${reason}`
    );
    return {
      success: false,
      outcome: 'AGENT_EXECUTION_ERROR',
      message: 'Fitness Buddy encountered an error. Please try again.',
    };
  }

  // ── Step 5: Read assistant reply ───────────────────────────────────────────
  let replyText: string | null;
  try {
    replyText = await readAssistantReply(token, runResult.thread_id);
  } catch (err) {
    const axiosErr = err as AxiosError;
    console.error(`[Orchestrate] Could not read reply. ${axiosErr.message}`);
    return {
      success: false,
      outcome: 'API_ERROR',
      message: 'Fitness Buddy is temporarily unavailable. Please try again.',
    };
  }

  if (!replyText) {
    console.error(
      `[Orchestrate] Run completed but no assistant message found. thread_id=${runResult.thread_id}`
    );
    return {
      success: false,
      outcome: 'AGENT_EXECUTION_ERROR',
      message: 'Fitness Buddy completed the request but returned an empty response.',
    };
  }

  return {
    success: true,
    outcome: 'SUCCESS',
    message: replyText,
    specialist: detectSpecialist(message),
  };
}
