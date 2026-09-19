import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Copy backend/.env.example to backend/.env and fill in the values.`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  debug: optionalEnv('DEBUG', 'false') === 'true',

  watsonx: {
    apiKey: '',
    projectId: '',
    url: '',
    modelId: '',
  },

  orchestrate: {
    url: '',
    apiKey: '',
    agentId: '',
    environment: 'draft', // 'draft' or 'live'
  },
};

/**
 * Validates and loads all required environment variables.
 * Called once at server startup — throws on missing required vars.
 * Never prints API key values in logs.
 */
export function validateEnv(): void {
  config.watsonx.apiKey = requireEnv('WATSONX_API_KEY');
  config.watsonx.projectId = requireEnv('WATSONX_PROJECT_ID');
  config.watsonx.url = requireEnv('WATSONX_URL');
  config.watsonx.modelId = requireEnv('WATSONX_MODEL_ID');

  // Orchestrate config is optional at startup — the service will return a
  // graceful error if these are missing when called.
  config.orchestrate.url = optionalEnv('ORCHESTRATE_URL', '');
  config.orchestrate.apiKey = optionalEnv('ORCHESTRATE_API_KEY', '');
  config.orchestrate.agentId = optionalEnv('ORCHESTRATE_AGENT_ID', '');
  config.orchestrate.environment = optionalEnv('ORCHESTRATE_ENVIRONMENT', 'draft');

  console.log('[Config] Environment validated successfully.');
  console.log(`[Config] watsonx.ai URL: ${config.watsonx.url}`);
  console.log(`[Config] watsonx.ai model: ${config.watsonx.modelId}`);
  console.log(`[Config] Project ID present: ${config.watsonx.projectId ? 'yes' : 'no'}`);
  console.log(
    `[Config] Orchestrate configured: ${config.orchestrate.url && config.orchestrate.apiKey ? 'yes' : 'no'}`
  );
}
