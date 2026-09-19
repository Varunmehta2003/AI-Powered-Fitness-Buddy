/**
 * Fitness Buddy — Granite Diagnostic Script
 *
 * Usage:  npm run test:granite
 *
 * This script:
 *   1. Validates required environment variables (without printing values)
 *   2. Obtains an IBM Cloud IAM token
 *   3. Lists available Granite foundation models in the configured region
 *   4. Verifies the configured WATSONX_MODEL_ID is available
 *   5. Runs a small test generation
 *
 * NEVER prints: API key, IAM token, project ID, or any secret.
 */

import dotenv from 'dotenv';
dotenv.config();

import { validateEnv, config } from '../config/env.js';
import { getIamToken, listGraniteModels, generateGraniteResponse } from '../services/watsonxService.js';

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

function ok(msg: string)   { console.log(`${GREEN}  ✔ ${msg}${RESET}`); }
function fail(msg: string) { console.log(`${RED}  ✘ ${msg}${RESET}`); }
function info(msg: string) { console.log(`${CYAN}  ℹ ${msg}${RESET}`); }
function warn(msg: string) { console.log(`${YELLOW}  ⚠ ${msg}${RESET}`); }
function section(msg: string) { console.log(`\n${BOLD}${msg}${RESET}`); }

async function runDiagnostic() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════╗`);
  console.log(`║   Fitness Buddy — Granite Diagnostic Tool    ║`);
  console.log(`╚══════════════════════════════════════════════╝${RESET}\n`);

  let iamOk = false;
  let modelAvailable = false;
  let generationOk = false;

  // ── Step 1: Environment variables ─────────────────────────────────────────
  section('Step 1: Environment Variables');

  try {
    validateEnv();
    ok('WATSONX_API_KEY is set');
    ok('WATSONX_PROJECT_ID is set');
    ok(`WATSONX_URL = ${config.watsonx.url}`);
    ok(`WATSONX_MODEL_ID = ${config.watsonx.modelId}`);

    // Warn if key length looks wrong (IBM Cloud API keys are 44 chars)
    if (config.watsonx.apiKey.length < 40) {
      warn(
        `WATSONX_API_KEY is only ${config.watsonx.apiKey.length} characters. ` +
        `IBM Cloud API keys are typically 44 characters. ` +
        `Generate a new one at: https://cloud.ibm.com/iam/apikeys`
      );
    }
  } catch (err) {
    fail((err as Error).message);
    process.exit(1);
  }

  // ── Step 2: IAM Authentication ─────────────────────────────────────────────
  section('Step 2: IBM Cloud IAM Authentication');

  let token: string;
  try {
    token = await getIamToken();
    ok('IAM token obtained successfully.');
    iamOk = true;
  } catch (err) {
    fail(`IAM authentication failed: ${(err as Error).message}`);
    printSummary(iamOk, modelAvailable, generationOk);
    process.exit(1);
  }

  // ── Step 3: Available Granite models ───────────────────────────────────────
  section('Step 3: Available Granite Models in Region');
  info(`Region: ${config.watsonx.url}`);

  let graniteModels: Array<{ model_id: string; name: string; lifecycle: string }> = [];
  try {
    graniteModels = await listGraniteModels();

    if (graniteModels.length === 0) {
      warn('No Granite models found in this region. Check your WATSONX_URL.');
    } else {
      console.log('');
      console.log(`  ${'Model ID'.padEnd(45)} ${'Name'.padEnd(35)} Status`);
      console.log(`  ${'─'.repeat(45)} ${'─'.repeat(35)} ──────`);
      for (const m of graniteModels) {
        const available = m.lifecycle === 'available' || m.lifecycle === 'unknown';
        const marker = available ? GREEN + '●' + RESET : YELLOW + '●' + RESET;
        console.log(`  ${marker} ${m.model_id.padEnd(44)} ${m.name.padEnd(35)} ${m.lifecycle}`);
      }
    }
  } catch (err) {
    warn(`Could not fetch model specs: ${(err as Error).message}`);
  }

  // ── Step 4: Verify configured model ───────────────────────────────────────
  section('Step 4: Configured Model Availability');

  const configuredModelId = config.watsonx.modelId;
  info(`Checking: ${configuredModelId}`);

  if (graniteModels.length > 0) {
    const found = graniteModels.find((m) => m.model_id === configuredModelId);
    if (found) {
      ok(`Model "${configuredModelId}" is available in this region.`);
      modelAvailable = true;
    } else {
      fail(`Model "${configuredModelId}" was NOT found in this region.`);
      warn('Available Granite model IDs in this region:');
      graniteModels.forEach((m) => warn(`  → ${m.model_id}`));
      warn('Update WATSONX_MODEL_ID in backend/.env to one of the models above.');
    }
  } else {
    warn('Could not verify model availability (model specs fetch failed).');
    info('Attempting generation anyway...');
    modelAvailable = true; // optimistic — let step 5 confirm
  }

  // ── Step 5: Test generation ────────────────────────────────────────────────
  section('Step 5: Granite Text Generation Test');

  const testPrompt = `You are Fitness Buddy, a friendly fitness assistant.

User:
Create a simple 15-minute beginner workout at home without equipment.

Return a concise workout with:
- warm-up
- exercises
- duration or reps
- rest
- cool-down

Fitness Buddy:`;

  info(`Sending test prompt to ${configuredModelId}...`);

  try {
    const result = await generateGraniteResponse(
      'Create a simple 15-minute beginner workout at home without equipment.',
      { fitnessLevel: 'beginner', durationMinutes: 15, equipment: 'none', location: 'home' },
      []
    );

    if (result.text && result.text.length > 0) {
      ok('Granite generation succeeded.');
      generationOk = true;
      console.log(`\n  ${CYAN}── Response preview (first 400 chars) ──${RESET}`);
      const preview = result.text.replace(/\n/g, '\n  ');
      console.log('  ' + preview.slice(0, 400));
      if (result.text.length > 400) console.log(`  ... (${result.text.length} total chars)`);
    } else {
      fail('Generation returned an empty response.');
    }
  } catch (err) {
    fail(`Granite generation failed: ${(err as Error).message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  printSummary(iamOk, modelAvailable, generationOk);

  if (!iamOk || !generationOk) {
    process.exit(1);
  }
}

function printSummary(iamOk: boolean, modelAvailable: boolean, generationOk: boolean) {
  const line = (label: string, passed: boolean) => {
    const status = passed ? `${GREEN}OK${RESET}` : `${RED}FAILED${RESET}`;
    console.log(`  ${label.padEnd(35)} ${status}`);
  };

  console.log(`\n${BOLD}╔══════════════════════════════════════╗`);
  console.log(`║             SUMMARY                  ║`);
  console.log(`╚══════════════════════════════════════╝${RESET}`);
  line('Granite authentication:', iamOk);
  line('Granite model available:', modelAvailable);
  line('Granite generation:', generationOk);
  console.log('');
}

runDiagnostic().catch((err) => {
  console.error('\n[Fatal]', (err as Error).message);
  process.exit(1);
});
