import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load the project-root `.env` file into `process.env` for local development.
 *
 * Walks up from the calling module's directory until it finds a `.env` next
 * to a `pnpm-workspace.yaml`. No-op (and silent) when no `.env` is found —
 * production deployments inject environment variables via the platform
 * (k8s Secrets / Helm values), so this helper exists purely for the
 * `pnpm <service> dev` flow.
 *
 * Call this at the TOP of every service / BFF `src/index.ts`, before any
 * other imports that might read `process.env` at module load time.
 */
export function loadProjectEnv(callerUrl: string): void {
  const start = dirname(fileURLToPath(callerUrl));
  let current = start;
  let parent = dirname(current);
  // Walk up at most 8 levels — enough for any reasonable monorepo depth.
  for (let i = 0; i < 8 && current !== parent; i += 1) {
    try {
      process.loadEnvFile(resolve(current, '.env'));
      return;
    } catch {
      // Try the next level up.
    }
    current = parent;
    parent = dirname(current);
  }
  // No .env found — production / CI / fresh checkout. Silent no-op.
}
