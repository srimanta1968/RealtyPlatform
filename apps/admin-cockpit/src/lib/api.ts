import {
  AuthClient,
  HttpClient,
  LeadClient,
  WorkflowClient,
  createBrowserTokenStorage,
  type LeadWorkflowExecution,
} from '@kiana/sdk';
import type {
  LeadRecord,
  LeadSourceSummary,
  LeadStage,
  WorkflowDefinition,
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

/** GET /api/workflows — list every business workflow defined on the platform. */
export async function listWorkflows(): Promise<WorkflowSummary[]> {
  return workflowClient.list();
}

/** GET /api/workflows/:slug — fetch a workflow definition with its full step list. */
export async function fetchWorkflow(slug: string): Promise<WorkflowDefinition> {
  return workflowClient.get(slug);
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
