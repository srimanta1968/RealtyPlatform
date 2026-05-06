/**
 * Regenerate the typed SDK from each service's OpenAPI spec.
 * Run with: pnpm gen:sdk
 *
 * Pipeline (per docs/Project-Structure.md §9.3):
 *   1. spectral lint each services/<svc>/openapi.yaml
 *   2. openapi-typescript generates dist into packages/sdk/src/clients/<svc>/generated/
 *   3. post-generate transforms (formatting, brand types) run
 *   4. tsup builds the SDK package
 *
 * Phase 1: placeholder — wire up once services start publishing real specs.
 */

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[gen:sdk] placeholder — wire @hey-api/openapi-ts here once specs stabilise.');
}

void main();
