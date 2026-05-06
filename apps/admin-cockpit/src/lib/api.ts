import {
  AuthClient,
  HttpClient,
  LeadClient,
  WorkflowClient,
  createBrowserTokenStorage,
  type LeadWorkflowExecution,
  type StaleLeadsReport,
} from '@kiana/sdk';
import type {
  LeadCreateRequest,
  LeadRecord,
  LeadSourceSummary,
  LeadStage,
  WorkflowDefinition,
  WorkflowMetrics,
  WorkflowSummary,
} from '@kiana/contracts';

const http = new HttpClient({
  baseUrl: '',
  tokenStorage: createBrowserTokenStorage(),
});

export const authClient = new AuthClient(http);
export const leadClient = new LeadClient(http);
export const workflowClient = new WorkflowClient(http);

/** GET /api/leads — list every captured lead in creation-time order. */
export async function listLeads(): Promise<LeadRecord[]> {
  return leadClient.list();
}

/** POST /api/leads — capture a new lead from operator-side input (walk-in, broker, etc.). */
export async function createLead(input: LeadCreateRequest): Promise<LeadRecord> {
  return leadClient.create(input);
}

/** GET /api/leads/:id — fetch a single captured lead. */
export async function fetchLead(id: string): Promise<LeadRecord> {
  return leadClient.get(id);
}

/** GET /api/leads/sources — catalog + per-source counts powering the inbox filter. */
export async function fetchLeadSources(): Promise<LeadSourceSummary> {
  return leadClient.listSources();
}

/** PATCH /api/leads/:id — advance a lead through the pipeline by setting a new stage. */
export async function updateLeadStage(id: string, stage: LeadStage): Promise<LeadRecord> {
  return leadClient.update(id, { stage });
}

/** PATCH /api/leads/:id — overwrite a lead's notes; pass null to clear. */
export async function updateLeadNotes(id: string, notes: string | null): Promise<LeadRecord> {
  return leadClient.update(id, { notes });
}

/** GET /api/workflows — list every business workflow defined on the platform. */
export async function listWorkflows(): Promise<WorkflowSummary[]> {
  return workflowClient.list();
}

/** GET /api/workflows/:slug — fetch a workflow definition with its full step list. */
export async function fetchWorkflow(slug: string): Promise<WorkflowDefinition> {
  return workflowClient.get(slug);
}

/** GET /api/workflows/:slug/metrics — funnel + conversion stats for one workflow. */
export async function fetchWorkflowMetrics(slug: string): Promise<WorkflowMetrics> {
  return workflowClient.getMetrics(slug);
}

/** GET /api/leads/stale — leads stuck in non-terminal stages older than `days`. */
export async function fetchStaleLeads(
  days?: number,
  workflowSlug?: string,
): Promise<StaleLeadsReport> {
  return leadClient.listStale(days, workflowSlug);
}

/** GET /api/leads/:id/execution — read a lead's workflow execution cursor. */
export async function fetchLeadExecution(
  id: string,
  workflowSlug?: string,
): Promise<LeadWorkflowExecution> {
  return leadClient.getExecution(id, workflowSlug);
}

/** POST /api/leads/:id/advance — advance a lead to the next workflow step. */
export async function advanceLead(
  id: string,
  workflowSlug?: string,
): Promise<LeadWorkflowExecution> {
  return leadClient.advance(id, workflowSlug);
}
