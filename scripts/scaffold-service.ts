/**
 * Scaffold a new service workspace under services/<name>.
 *
 * Usage: pnpm scaffold:service <name>
 *
 * Generates:
 *   services/<name>/{package.json,tsconfig.json,Dockerfile,openapi.yaml}
 *   services/<name>/src/{server.ts,index.ts}
 *   db/<name>/migrations/0001_init.sql
 */

const name = process.argv[2];
if (!name) {
  // eslint-disable-next-line no-console
  console.error('Usage: pnpm scaffold:service <name>');
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`[scaffold:service] placeholder — would scaffold services/${name} here.`);
