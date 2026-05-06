/**
 * Idempotent schema bootstrap for crm-service. Phase-1 lite: no own tables —
 * crm-service is read-only over leads + users on the shared kiana DB
 * (Project-Structure.md §11.1: Phase 1 has logical isolation, physical
 * consolidation; cross-service-via-API enforcement lands in P4+).
 *
 * The CREATE EXTENSION line is here so a fresh DB without pgcrypto fails
 * fast at startup rather than at first lead-create. Subsequent restarts
 * are a no-op.
 */
export const CRM_SERVICE_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
`;
