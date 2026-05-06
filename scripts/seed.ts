/**
 * Dev-only seed script. Populates each service's logical database with
 * representative fixture data so the admin cockpit and BFF have something
 * to render locally.
 *
 * Run with: pnpm db:seed
 */

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[seed] Phase 1 seeder is a placeholder — wire up per-service seeders here.');
  // TODO: import each service's seeder once they exist.
  // e.g.:
  // await import('../services/user-service/scripts/seed.js');
  // await import('../services/lead-service/scripts/seed.js');
}

void main();
