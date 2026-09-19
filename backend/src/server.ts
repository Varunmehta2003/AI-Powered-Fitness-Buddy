import { validateEnv, config } from './config/env.js';
import app from './app.js';

// Validate all required environment variables before starting
validateEnv();

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Server] Fitness Buddy API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] CORS origin: ${config.frontendUrl}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err.message);
  process.exit(1);
});
