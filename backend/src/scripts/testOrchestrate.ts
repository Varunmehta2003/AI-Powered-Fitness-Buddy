/**
 * Fitness Buddy — watsonx Orchestrate Diagnostic Script
 *
 * Usage:  npm run test:orchestrate
 *
 * Confirmed API flow (native WxO agents):
 *   POST /v1/orchestrate/runs   { agent_id, message: { role, content } }
 *     → { run_id, thread_id, task_id, message_id }
 *   GET  /v1/orchestrate/runs/{run_id}
 *     → { status: 'running'|'completed'|'failed'|'cancelled' }
 *   GET  /v1/orchestrate/threads/{thread_id}/messages
 *     → assistant reply
 *
 * NEVER prints: API key, IAM token, Authorization headers, cookies, secrets.
 */

import dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosError } from 'axios';
import { validateEnv, config } from '../config/env.js';
import {
  getOrchestrateAccessToken,
  discoverAgents,
  getAgentDetails,
  agentHasLiveEnvironment,
  isOrchestrateConfigured,
  type AgentRecord,
  type RunRecord,
} from '../services/orchestrateService.js';

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

const ok      = (msg: string) => console.log(`${GREEN}  ✔ ${msg}${RESET}`);
const fail    = (msg: string) => console.log(`${RED}  ✘ ${msg}${RESET}`);
const info    = (msg: string) => console.log(`${CYAN}  ℹ ${msg}${RESET}`);
const warn    = (msg: string) => console.log(`${YELLOW}  ⚠ ${msg}${RESET}`);
const section = (msg: string) => console.log(`\n${BOLD}${msg}${RESET}`);
const devlog  = (msg: string) => console.log(`  [dev] ${msg}`);

// ── Summary state ─────────────────────────────────────────────────────────────
let authOk          = false;
let discoveryOk     = false;
let agentFound      = false;
let liveEnv         = false;
let threadCreated   = false;
let msgCreated      = false;
let execTriggered: 'YES' | 'NO' | 'UNKNOWN' = 'NO';
let responseOk: 'OK' | 'FAILED' | 'SKIPPED' = 'SKIPPED';

async function run() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════╗`);
  console.log(`║   Fitness Buddy — Orchestrate Diagnostic Tool        ║`);
  console.log(`╚══════════════════════════════════════════════════════╝${RESET}\n`);

  // ── Step 1: Environment variables ─────────────────────────────────────────
  section('Step 1: Environment Variables');

  try { validateEnv(); } catch { /* watsonx vars optional for this script */ }

  const orchUrl    = process.env['ORCHESTRATE_URL']     ?? '';
  const orchKeyLen = (process.env['ORCHESTRATE_API_KEY'] ?? '').length;
  const orchAgent  = process.env['ORCHESTRATE_AGENT_ID'] ?? '';
  const orchEnv    = process.env['ORCHESTRATE_ENVIRONMENT'] ?? 'draft';

  const missing: string[] = [];
  if (!orchUrl)    missing.push('ORCHESTRATE_URL');
  if (!orchKeyLen) missing.push('ORCHESTRATE_API_KEY');
  if (!orchAgent)  missing.push('ORCHESTRATE_AGENT_ID');

  if (missing.length > 0) {
    missing.forEach(v => fail(`${v} is missing or empty`));
    warn('Set these in backend/.env and rerun.');
    printSummary(); process.exit(1);
  }

  ok(`ORCHESTRATE_URL = ${orchUrl}`);
  ok(`ORCHESTRATE_API_KEY is set (length=${orchKeyLen})`);
  ok(`ORCHESTRATE_AGENT_ID = ${orchAgent}`);
  ok(`ORCHESTRATE_ENVIRONMENT = ${orchEnv}`);

  if (!isOrchestrateConfigured()) {
    fail('isOrchestrateConfigured() returned false');
    process.exit(1);
  }

  // ── Step 2: IAM authentication ─────────────────────────────────────────────
  section('Step 2: IBM Cloud IAM Authentication');
  info('Exchanging ORCHESTRATE_API_KEY for IAM bearer token...');

  let token: string;
  try {
    token = await getOrchestrateAccessToken();
    ok('IAM token obtained. (token not printed)');
    authOk = true;
  } catch (err) {
    const e = err as AxiosError;
    const status = e.response?.status;
    const ibmBody = e.response?.data as Record<string, unknown> | undefined;
    const ibmCode = String(ibmBody?.['errorCode'] ?? ibmBody?.['errorMessage'] ?? e.message);
    fail(`IAM authentication failed.`);
    devlog(`HTTP ${status ?? 'N/A'} | IBM: ${ibmCode}`);
    if (orchKeyLen < 40) warn(`API key is only ${orchKeyLen} chars — IBM Cloud keys are 44 chars.`);
    printSummary(); process.exit(1);
  }

  // ── Step 3: Agent discovery ────────────────────────────────────────────────
  section('Step 3: Agent Discovery');
  info(`GET ${config.orchestrate.url}/v1/orchestrate/agents`);

  let agents: AgentRecord[] = [];
  try {
    agents = await discoverAgents();
    ok(`Discovery succeeded — ${agents.length} agent(s) found.`);
    discoveryOk = true;
    console.log('');
    console.log(`  ${'Agent ID'.padEnd(38)} ${'Display Name'.padEnd(30)} Environments`);
    console.log(`  ${'─'.repeat(38)} ${'─'.repeat(30)} ────────────────────────`);
    for (const a of agents) {
      const name = (a.display_name ?? a.name).padEnd(30);
      const envs = a.environments
        ?.map(e => `${e.name}(v${e.current_version ?? 'draft'})`)
        .join(' ') ?? 'unknown';
      console.log(`  ${a.id.padEnd(38)} ${name} ${envs}`);
    }
  } catch (err) {
    const e = err as AxiosError;
    const ibmBody = e.response?.data as Record<string, unknown> | undefined;
    fail(`Agent discovery failed.`);
    devlog(`HTTP ${e.response?.status ?? e.code} | ${String(ibmBody?.['message'] ?? e.message)}`);
    printSummary(); process.exit(1);
  }

  // ── Step 4: Locate primary agent ──────────────────────────────────────────
  section('Step 4: Locate Primary Agent');
  info(`Looking for ORCHESTRATE_AGENT_ID: ${config.orchestrate.agentId}`);

  let agentRecord: AgentRecord | null = null;
  try {
    agentRecord = await getAgentDetails(config.orchestrate.agentId);
  } catch (err) {
    warn(`getAgentDetails failed: ${(err as Error).message}`);
  }
  if (!agentRecord) {
    agentRecord = agents.find(a => a.id === config.orchestrate.agentId) ?? null;
  }

  if (agentRecord) {
    const name = agentRecord.display_name ?? agentRecord.name;
    ok(`Found: "${name}" (${agentRecord.id})`);
    if (agentRecord.description) info(`Description: ${agentRecord.description.slice(0, 120)}…`);
    agentFound = true;
  } else {
    fail(`Agent ${config.orchestrate.agentId} not found.`);
    warn('Check ORCHESTRATE_AGENT_ID in backend/.env — valid IDs shown in Step 3.');
    printSummary(); process.exit(1);
  }

  // ── Step 5: Live environment ───────────────────────────────────────────────
  section('Step 5: Live Environment Check');

  if (agentRecord.environments?.length) {
    agentRecord.environments.forEach(e => {
      const published = e.current_version !== null;
      const dot = published ? GREEN + '●' + RESET : YELLOW + '●' + RESET;
      console.log(`  ${dot} ${e.name.padEnd(10)} version=${e.current_version ?? 'none'} id=${e.id}`);
    });
  }

  liveEnv = agentHasLiveEnvironment(agentRecord);

  if (liveEnv) {
    ok('Agent has a published LIVE environment — runs will execute.');
  } else {
    warn('Agent is DRAFT only. Publish it in the Orchestrate UI before proceeding.');
    warn('  Orchestrate → Agents → Fitness Buddy → Publish → live');
    printSummary();
    return; // Don't attempt run
  }

  // ── Step 6: Start run (POST /v1/orchestrate/runs) ─────────────────────────
  section('Step 6: Start Run (POST /v1/orchestrate/runs)');
  info('Body: { agent_id, message: { role: "user", content: "..." } }');
  info('Test prompt: "Give me a quick 3-exercise beginner workout."');

  let runId = '';
  let threadId = '';
  let messageId = '';

  try {
    const runRes = await axios.post(
      `${config.orchestrate.url}/v1/orchestrate/runs`,
      {
        agent_id: config.orchestrate.agentId,
        message: { role: 'user', content: 'Give me a quick 3-exercise beginner workout.' },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20_000,
      }
    );

    const data = runRes.data as {
      run_id: string; thread_id: string; task_id: string; message_id: string;
    };
    runId      = data.run_id;
    threadId   = data.thread_id;
    messageId  = data.message_id;

    ok(`Run started.`);
    devlog(`HTTP ${runRes.status}`);
    devlog(`run_id     = ${runId}`);
    devlog(`thread_id  = ${threadId}`);
    devlog(`task_id    = ${data.task_id}`);
    devlog(`message_id = ${messageId}`);

    execTriggered = 'YES';
    threadCreated = true;
    msgCreated    = true;
  } catch (err) {
    const e = err as AxiosError;
    const ibmBody = e.response?.data as Record<string, unknown> | undefined;
    const ibmMsg = String(ibmBody?.['detail'] ?? ibmBody?.['message'] ?? e.message);
    fail(`Failed to start run.`);
    devlog(`HTTP ${e.response?.status ?? e.code} | ${ibmMsg}`);
    execTriggered = 'NO';
    printSummary();
    process.exit(1);
  }

  // ── Step 7: Poll run status ────────────────────────────────────────────────
  section('Step 7: Poll Run Status (GET /v1/orchestrate/runs/{run_id})');
  info(`run_id = ${runId}`);
  info('Polling every 2s — terminal states: completed, failed, cancelled');

  const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'error']);
  let runRecord: RunRecord | null = null;
  let attempts = 0;
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2_000));
    attempts++;

    try {
      const pollRes = await axios.get(
        `${config.orchestrate.url}/v1/orchestrate/runs/${runId}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          timeout: 15_000,
        }
      );
      const run = pollRes.data as RunRecord;
      devlog(`attempt=${attempts} status=${run.status} completed_at=${run.completed_at ?? 'null'}`);

      if (TERMINAL.has(run.status)) {
        runRecord = run;
        break;
      }
    } catch (err) {
      const e = err as AxiosError;
      const ibmBody = e.response?.data as Record<string, unknown> | undefined;
      fail(`Run poll failed.`);
      devlog(`HTTP ${e.response?.status ?? e.code} | ${String(ibmBody?.['message'] ?? e.message)}`);
      printSummary(); process.exit(1);
    }
  }

  if (!runRecord) {
    fail(`Run did not reach terminal state within 90s. Last attempt=${attempts}`);
    responseOk = 'FAILED';
    printSummary(); process.exit(1);
  }

  devlog(`Final run status = ${runRecord.status}`);
  devlog(`completed_at = ${runRecord.completed_at ?? 'null'}`);
  devlog(`failed_at    = ${runRecord.failed_at ?? 'null'}`);
  devlog(`last_error   = ${runRecord.last_error ?? 'none'}`);

  if (runRecord.status !== 'completed') {
    fail(`Run ended with status: ${runRecord.status}`);
    if (runRecord.last_error) devlog(`error: ${runRecord.last_error}`);
    responseOk = 'FAILED';
    printSummary(); process.exit(1);
  }

  ok(`Run completed in ~${attempts * 2}s.`);

  // ── Step 8: Read assistant reply ──────────────────────────────────────────
  section('Step 8: Read Assistant Reply');
  info(`GET /v1/orchestrate/threads/${threadId}/messages`);

  try {
    const msgsRes = await axios.get(
      `${config.orchestrate.url}/v1/orchestrate/threads/${threadId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 15_000,
      }
    );

    const messages = msgsRes.data as Array<{
      id: string; role: string;
      content: Array<{ response_type?: string; text?: string }> | string;
    }>;

    devlog(`Total messages in thread: ${messages.length}`);
    devlog(`Roles: ${messages.map(m => m.role).join(', ')}`);

    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length === 0) {
      fail('No assistant message found in thread.');
      responseOk = 'FAILED';
      printSummary(); process.exit(1);
    }

    const latest = assistantMsgs[assistantMsgs.length - 1]!;
    let replyText = '';

    if (Array.isArray(latest.content)) {
      replyText = latest.content.map(c => c.text ?? '').join('\n').trim();
    } else if (typeof latest.content === 'string') {
      replyText = latest.content.trim();
    }

    if (!replyText) {
      fail('Assistant message found but content is empty.');
      devlog(`raw content: ${JSON.stringify(latest.content).slice(0, 200)}`);
      responseOk = 'FAILED';
      printSummary(); process.exit(1);
    }

    ok(`Assistant reply received (${replyText.length} chars).`);
    console.log(`\n  ${CYAN}── Response preview (first 600 chars) ──${RESET}`);
    console.log('  ' + replyText.slice(0, 600).replace(/\n/g, '\n  '));
    responseOk = 'OK';
  } catch (err) {
    const e = err as AxiosError;
    const ibmBody = e.response?.data as Record<string, unknown> | undefined;
    fail('Failed to read thread messages.');
    devlog(`HTTP ${e.response?.status ?? e.code} | ${String(ibmBody?.['message'] ?? e.message)}`);
    responseOk = 'FAILED';
    printSummary(); process.exit(1);
  }

  printSummary();
}

function printSummary() {
  const line = (label: string, value: string, pass: boolean, skip = false) => {
    const color = pass ? GREEN : skip ? YELLOW : RED;
    console.log(`  ${label.padEnd(40)} ${color}${value}${RESET}`);
  };

  console.log(`\n${BOLD}╔════════════════════════════════════════════╗`);
  console.log(`║                  SUMMARY                  ║`);
  console.log(`╚════════════════════════════════════════════╝${RESET}`);
  line('Orchestrate authentication:',  authOk        ? 'OK'      : 'FAILED',  authOk);
  line('Agent discovery:',             discoveryOk   ? 'OK'      : 'FAILED',  discoveryOk);
  line('Primary agent found:',         agentFound    ? 'YES'     : 'NO',      agentFound);
  line('Live environment:',            liveEnv       ? 'YES'     : 'NO',      liveEnv);
  line('Thread creation:',             threadCreated ? 'OK'      : 'FAILED',  threadCreated, !agentFound);
  line('Message creation:',            msgCreated    ? 'OK'      : 'FAILED',  msgCreated,    !agentFound);
  line('Agent execution triggered:',   execTriggered, execTriggered === 'YES', execTriggered === 'UNKNOWN');
  line('Assistant response:',          responseOk,   responseOk === 'OK',    responseOk === 'SKIPPED');
  console.log('');
}

run().catch(err => {
  console.error(`\n${RED}[Fatal]${RESET}`, (err as Error).message);
  process.exit(1);
});
