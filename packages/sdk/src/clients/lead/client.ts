import type {
  ApiResponse,
  LeadCreateRequest,
  LeadRecord,
  LeadSourceSummary,
  LeadUpdateRequest,
  WorkflowExecutionState,
} from '@kiana/contracts';

export interface LeadWorkflowExecution {
  lead: LeadRecord;
  execution: WorkflowExecutionState;
}

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class LeadClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/leads — capture a new lead. */
  async create(input: LeadCreateRequest): Promise<LeadRecord> {
    const response = await this.http.request<ApiResponse<{ lead: LeadRecord }>>('/api/leads', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    return unwrap(response).lead;
  }

  /** GET /api/leads — list leads (paginated; cursor support added later). */
  async list(): Promise<LeadRecord[]> {
    const response = await this.http.request<ApiResponse<{ leads: LeadRecord[] }>>('/api/leads');
    return unwrap(response).leads;
  }

  /** GET /api/leads/:id — fetch a single lead. */
  async get(id: string): Promise<LeadRecord> {
    const response = await this.http.request<ApiResponse<{ lead: LeadRecord }>>(
      `/api/leads/${encodeURIComponent(id)}`,
    );
    return unwrap(response).lead;
  }

  /** GET /api/leads/sources — catalog of supported sources + per-source lead counts. */
  async listSources(): Promise<LeadSourceSummary> {
    const response = await this.http.request<ApiResponse<LeadSourceSummary>>(
      '/api/leads/sources',
      { authenticated: false },
    );
    return unwrap(response);
  }

  /** PATCH /api/leads/:id — update a lead's stage (and any future mutable fields). */
  async update(id: string, input: LeadUpdateRequest): Promise<LeadRecord> {
    const response = await this.http.request<ApiResponse<{ lead: LeadRecord }>>(
      `/api/leads/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
    return unwrap(response).lead;
  }

  /** GET /api/leads/:id/execution — read the workflow cursor (current step + next step + progress). */
  async getExecution(id: string, workflowSlug?: string): Promise<LeadWorkflowExecution> {
    const path = workflowSlug
      ? `/api/leads/${encodeURIComponent(id)}/execution?workflow=${encodeURIComponent(workflowSlug)}`
      : `/api/leads/${encodeURIComponent(id)}/execution`;
    const response = await this.http.request<ApiResponse<LeadWorkflowExecution>>(path);
    return unwrap(response);
  }

  /** POST /api/leads/:id/advance — move the lead to its next workflow step. */
  async advance(id: string, workflowSlug?: string): Promise<LeadWorkflowExecution> {
    const path = workflowSlug
      ? `/api/leads/${encodeURIComponent(id)}/advance?workflow=${encodeURIComponent(workflowSlug)}`
      : `/api/leads/${encodeURIComponent(id)}/advance`;
    const response = await this.http.request<ApiResponse<LeadWorkflowExecution>>(path, {
      method: 'POST',
      body: {},
    });
    return unwrap(response);
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
