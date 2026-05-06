import {
  AuthClient,
  CrmClient,
  HttpClient,
  LeadClient,
  PropertyClient,
  UserClient,
  WorkflowClient,
  createBrowserTokenStorage,
  type LeadWorkflowExecution,
  type PipelineKanban,
  type PropertyListFilter,
  type StaleLeadsReport,
} from '@kiana/sdk';
import type {
  LeadCreateRequest,
  LeadRecord,
  LeadSourceSummary,
  LeadStage,
  PropertyCreateRequest,
  PropertyRecord,
  PropertyStatus,
  PropertyUpdateRequest,
  StaffInviteIssueResult,
  StaffInviteRequest,
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
export const propertyClient = new PropertyClient(http);
export const crmClient = new CrmClient(http);
export const userClient = new UserClient(http);

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

/** DELETE /api/leads/:id — hard-delete a captured lead. */
export async function deleteLead(id: string): Promise<void> {
  return leadClient.delete(id);
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

/** GET /api/properties — list properties (filters: type / location / price range). */
export async function listProperties(
  filter: PropertyListFilter = {},
): Promise<PropertyRecord[]> {
  return propertyClient.list(filter);
}

/** POST /api/properties — admin creates a draft property. */
export async function createProperty(input: PropertyCreateRequest): Promise<PropertyRecord> {
  return propertyClient.create(input);
}

/** PATCH /api/properties/:id — admin partial update. */
export async function updateProperty(
  id: string,
  input: PropertyUpdateRequest,
): Promise<PropertyRecord> {
  return propertyClient.update(id, input);
}

/** PATCH /api/properties/:id/publish — admin moves the publish state machine. */
export async function publishProperty(
  id: string,
  status: PropertyStatus = 'published',
): Promise<PropertyRecord> {
  return propertyClient.publish(id, status);
}

/** GET /api/crm/pipeline — kanban aggregation across the lead pipeline. */
export async function fetchPipeline(
  query: { owner_id?: string; per_stage_limit?: number } = {},
): Promise<PipelineKanban> {
  return crmClient.getKanban(query);
}

/** POST /api/users/invite — admin issues a staff invite. */
export async function inviteStaff(input: StaffInviteRequest): Promise<StaffInviteIssueResult> {
  return userClient.invite(input);
}
