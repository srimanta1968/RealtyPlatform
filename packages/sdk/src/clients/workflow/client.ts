import type {
  ApiResponse,
  WorkflowDefinition,
  WorkflowMetrics,
  WorkflowSummary,
} from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class WorkflowClient {
  constructor(private readonly http: HttpClient) {}

  /** GET /api/workflows — catalog of every business workflow defined on the platform. */
  async list(): Promise<WorkflowSummary[]> {
    const response = await this.http.request<ApiResponse<{ workflows: WorkflowSummary[] }>>(
      '/api/workflows',
    );
    return unwrap(response).workflows;
  }

  /** GET /api/workflows/:slug — full definition (including steps[]) for one workflow. */
  async get(slug: string): Promise<WorkflowDefinition> {
    const response = await this.http.request<ApiResponse<{ workflow: WorkflowDefinition }>>(
      `/api/workflows/${encodeURIComponent(slug)}`,
    );
    return unwrap(response).workflow;
  }

  /** GET /api/workflows/:slug/metrics — funnel + conversion stats for the workflow. */
  async getMetrics(slug: string): Promise<WorkflowMetrics> {
    const response = await this.http.request<ApiResponse<{ metrics: WorkflowMetrics }>>(
      `/api/workflows/${encodeURIComponent(slug)}/metrics`,
    );
    return unwrap(response).metrics;
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
