/**
 * Drop and recreate every per-service logical database, then re-run all
 * migrations. DEV ONLY — refuses to run if NODE_ENV=production.
 *
 * Run with: pnpm db:reset
 */

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.error('Refusing to reset databases in production.');
  process.exit(1);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[reset-db] placeholder — wire up per-service reset hooks here.');
}

void main();
